-- Goal transfers: deposits and savings-funded withdrawals.
-- See docs/adr/004-goal-transfers.md.
--
-- Money moving into a Goal (deposit, opening balance) or out of it (withdrawal
-- covering a savings-funded expense) is recorded in goal_transfers. A trigger
-- keeps goals.current_amount in step, and a deferred constraint trigger keeps
-- it from ever ending a transaction negative. Transactions and goals are
-- written only through the save_transaction / create_goal functions.

begin;

-- ---------------------------------------------------------------------------
-- Pre-flight: stop, listing the rows, instead of guessing or rounding.
-- ---------------------------------------------------------------------------
do $$
declare
  v_rows text;
begin
  select string_agg(id::text || ' (' || current_amount::text || ')', ', ')
    into v_rows
    from public.goals
   where current_amount < 0 or current_amount <> round(current_amount, 2);
  if v_rows is not null then
    raise exception 'goal_transfers pre-flight: goals with a negative or non-2-decimal current_amount: %', v_rows;
  end if;

  -- ADR-004 requires every savings-funded expense to point to a Goal; rows
  -- saved before it have none.
  select string_agg(id::text, ', ')
    into v_rows
    from public.transactions
   where funding_source = 'savings';
  if v_rows is not null then
    raise exception 'goal_transfers pre-flight: savings-funded transactions without a goal: %', v_rows;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------
create table public.goal_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- NO ACTION (the default), not RESTRICT: it is checked at the end of the
  -- statement, so deleting an account can cascade through goals and transfers.
  goal_id uuid not null references public.goals (id),
  kind text not null
    constraint goal_transfers_kind_values check (kind in ('opening_balance', 'deposit', 'withdrawal')),
  -- Unconstrained numeric: numeric(12,2) would round 10.005 to 10.01 before the
  -- checks run. Positive, at most 2 decimals, and small enough for
  -- goals.current_amount (numeric(12,2)).
  amount numeric not null
    constraint goal_transfers_amount_positive check (amount > 0)
    constraint goal_transfers_amount_cents check (amount = round(amount, 2))
    constraint goal_transfers_amount_max check (amount < 10000000000),
  date date not null,
  transaction_id uuid unique references public.transactions (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- A withdrawal always covers exactly one expense, and only withdrawals do.
  constraint goal_transfers_withdrawal_linked check ((kind = 'withdrawal') = (transaction_id is not null))
);

create index goal_transfers_user_id_date_idx on public.goal_transfers (user_id, date);
create index goal_transfers_goal_id_idx on public.goal_transfers (goal_id);

alter table public.goal_transfers enable row level security;

create policy "Users read their own goal transfers"
  on public.goal_transfers for select to authenticated
  using (auth.uid() = user_id);

-- Clients may only add deposits to their own goals; opening balances and
-- withdrawals are written by create_goal / save_transaction.
create policy "Users add deposits to their own goals"
  on public.goal_transfers for insert to authenticated
  with check (
    auth.uid() = user_id
    and kind = 'deposit'
    and transaction_id is null
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

create policy "Users delete their own deposits"
  on public.goal_transfers for delete to authenticated
  using (auth.uid() = user_id and kind = 'deposit');

revoke all on public.goal_transfers from anon, authenticated;
grant select, insert, delete on public.goal_transfers to authenticated;

-- ---------------------------------------------------------------------------
-- Opening balances: existing current_amount becomes the first ledger row.
-- Inserted BEFORE the balance trigger exists, so balances are not doubled.
-- ---------------------------------------------------------------------------
insert into public.goal_transfers (user_id, goal_id, kind, amount, date)
select user_id, id, 'opening_balance', current_amount, coalesce(created_at, now())::date
  from public.goals
 where current_amount > 0;

-- ---------------------------------------------------------------------------
-- Balance: current_amount is a cache of the ledger, written only here.
-- security definer because clients lose update on goals below.
-- ---------------------------------------------------------------------------
create function public.apply_goal_transfer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.goals
       set current_amount = current_amount
         - case when old.kind = 'withdrawal' then -old.amount else old.amount end
     where id = old.goal_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.goals
       set current_amount = current_amount
         + case when new.kind = 'withdrawal' then -new.amount else new.amount end
     where id = new.goal_id;
  end if;

  return null;
end;
$$;

create trigger goal_transfers_apply_balance
  after insert or update or delete on public.goal_transfers
  for each row execute function public.apply_goal_transfer();

-- A Goal never ends a transaction negative. Deferred to commit (a CHECK cannot
-- be): deleting an account cascades through transfers in no fixed order, and a
-- Goal may pass through a negative balance before it is itself deleted.
create function public.check_goal_balance_non_negative()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.goals where id = new.id and current_amount < 0) then
    raise exception using errcode = 'P0001', message = 'goal_balance_negative', detail = new.id::text;
  end if;
  return null;
end;
$$;

create constraint trigger goals_current_amount_non_negative
  after insert or update of current_amount on public.goals
  deferrable initially deferred
  for each row
  when (new.current_amount < 0)
  execute function public.check_goal_balance_non_negative();

-- ---------------------------------------------------------------------------
-- Writes go through the functions below only.
-- ---------------------------------------------------------------------------
revoke insert, update on public.goals from anon, authenticated;
revoke insert, update on public.transactions from anon, authenticated;
revoke insert, update, delete on public.transaction_payments from anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_goal: a Goal and its optional opening balance, together.
-- ---------------------------------------------------------------------------
create function public.create_goal(
  p_name text,
  p_target_amount numeric,
  p_target_date date,
  p_opening_balance numeric,
  p_today date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_opening numeric := coalesce(p_opening_balance, 0);
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if p_target_amount is null or p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 2)
     or v_opening < 0 or v_opening <> round(v_opening, 2) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  insert into public.goals (user_id, name, target_amount, current_amount, target_date)
  values (v_uid, p_name, p_target_amount, 0, p_target_date)
  returning id into v_id;

  if v_opening > 0 then
    -- p_today is the client's local date, like every other date in Finora.
    insert into public.goal_transfers (user_id, goal_id, kind, amount, date)
    values (v_uid, v_id, 'opening_balance', v_opening, coalesce(p_today, current_date));
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_transaction: creates (p_id null) or updates a transaction with its
-- payments and, when p_savings_goal_id is given, the withdrawal from that Goal
-- for the full amount on the transaction's date - all or nothing.
-- p_payments: [{"payment_method": text, "amount": number}, ...]
-- ---------------------------------------------------------------------------
create function public.save_transaction(
  p_id uuid,
  p_description text,
  p_amount numeric,
  p_type text,
  p_category_id uuid,
  p_date date,
  p_notes text,
  p_installment_months integer,
  p_savings_goal_id uuid,
  p_payments jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := p_id;
  v_old_goal uuid;
  v_available numeric;
  v_payments_total numeric;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  if p_payments is null or jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception using errcode = 'P0001', message = 'payments_do_not_match_amount';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_payments) p
     where coalesce(p ->> 'payment_method', '') = ''
        or jsonb_typeof(p -> 'amount') <> 'number'
        or (p ->> 'amount')::numeric <= 0
        or (p ->> 'amount')::numeric <> round((p ->> 'amount')::numeric, 2)
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  select sum((p ->> 'amount')::numeric) into v_payments_total from jsonb_array_elements(p_payments) p;
  if v_payments_total <> p_amount then
    raise exception using errcode = 'P0001', message = 'payments_do_not_match_amount';
  end if;

  -- ADR-003/004: only expenses are financed or savings-funded, and a financed
  -- purchase has a single payment method. The months range is a table check.
  if (p_type <> 'expense' and (p_savings_goal_id is not null or p_installment_months <> 1))
     or (p_installment_months > 1 and jsonb_array_length(p_payments) <> 1) then
    raise exception using errcode = 'P0001', message = 'invalid_payment_plan';
  end if;

  if v_id is not null then
    perform 1 from public.transactions where id = v_id and user_id = v_uid for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'transaction_not_found';
    end if;
    select goal_id into v_old_goal from public.goal_transfers where transaction_id = v_id;
  end if;

  -- Lock every Goal whose balance can change, in id order, so moving a
  -- withdrawal A -> B concurrently with B -> A cannot deadlock.
  perform 1
     from public.goals
    where id in (v_old_goal, p_savings_goal_id) and user_id = v_uid
    order by id
      for update;

  if p_savings_goal_id is not null
     and not exists (select 1 from public.goals where id = p_savings_goal_id and user_id = v_uid) then
    raise exception using errcode = 'P0001', message = 'goal_not_found';
  end if;

  if v_id is null then
    insert into public.transactions (
      user_id, description, amount, type, category_id, date, notes, installment_months, funding_source
    )
    values (
      v_uid, p_description, p_amount, p_type, p_category_id, p_date, p_notes, p_installment_months,
      case when p_savings_goal_id is null then 'income' else 'savings' end
    )
    returning id into v_id;
  else
    update public.transactions
       set description = p_description,
           amount = p_amount,
           type = p_type,
           category_id = p_category_id,
           date = p_date,
           notes = p_notes,
           installment_months = p_installment_months,
           funding_source = case when p_savings_goal_id is null then 'income' else 'savings' end
     where id = v_id and user_id = v_uid;
  end if;

  delete from public.transaction_payments where transaction_id = v_id;
  insert into public.transaction_payments (transaction_id, user_id, payment_method, amount)
  select v_id, v_uid, p ->> 'payment_method', (p ->> 'amount')::numeric
    from jsonb_array_elements(p_payments) p;

  -- Return any previous withdrawal to its Goal first, then check and take the
  -- new one, so editing within the same Goal only needs the difference.
  delete from public.goal_transfers where transaction_id = v_id;

  if p_savings_goal_id is not null then
    select current_amount into v_available from public.goals where id = p_savings_goal_id;
    if v_available < p_amount then
      raise exception using errcode = 'P0001', message = 'insufficient_goal_funds', detail = v_available::text;
    end if;

    insert into public.goal_transfers (user_id, goal_id, kind, amount, date, transaction_id)
    values (v_uid, p_savings_goal_id, 'withdrawal', p_amount, p_date, v_id);
  end if;

  return v_id;
end;
$$;

revoke execute on function public.apply_goal_transfer() from public, anon, authenticated;
revoke execute on function public.check_goal_balance_non_negative() from public, anon, authenticated;
revoke execute on function public.create_goal(text, numeric, date, numeric, date) from public, anon;
revoke execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb)
  from public, anon;
grant execute on function public.create_goal(text, numeric, date, numeric, date) to authenticated;
grant execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb)
  to authenticated;

commit;

-- Reconciliation (run any time; should return no rows):
-- select g.id, g.current_amount,
--        coalesce(sum(case when t.kind = 'withdrawal' then -t.amount else t.amount end), 0) as ledger
--   from public.goals g
--   left join public.goal_transfers t on t.goal_id = g.id
--  group by g.id, g.current_amount
-- having g.current_amount <> coalesce(sum(case when t.kind = 'withdrawal' then -t.amount else t.amount end), 0);
