-- Case B: a household expense with nothing to split (e.g. "medicine $250,
-- household, I paid all of it"), separate from Case A's exact two-person
-- split (ADR-009). Also budgets.is_household, so a budget's spend can later
-- be computed from both members' tagged expenses (ADR-010's "two entries").
-- See docs/adr/010-household-expense-tag-and-household-budget.md.
--
-- No data pre-flight needed: both new columns default false/to nothing for
-- every existing row.

begin;

-- ---------------------------------------------------------------------------
-- transactions.is_household_expense (Case B)
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column is_household_expense boolean not null default false;

-- A transaction is Case A (is_shared), Case B (is_household_expense), or
-- neither - never both. A split expense is already "of the household" by
-- definition and needs no second tag.
alter table public.transactions
  add constraint transactions_household_or_shared_exclusive
    check (not (is_shared and is_household_expense));

-- Case B deliberately does NOT inherit Case A's v1 restrictions
-- (transactions_shared_expense_only): it splits nothing, so it does not
-- interact with financing, savings or refunds the way a two-person split
-- would. Only type = 'expense' applies, checked in save_transaction below
-- (a table check would duplicate transactions_shared_expense_only's shape
-- for a constraint that, unlike that one, has nothing else to say).

-- ---------------------------------------------------------------------------
-- budgets.is_household: one column, no new table, no RPC (ADR-010) - budgets
-- has never had one; is_household needs no cross-row atomicity to protect.
-- ---------------------------------------------------------------------------
alter table public.budgets
  add column is_household boolean not null default false;

-- ---------------------------------------------------------------------------
-- save_transaction: gains p_is_household_expense (13th argument, default
-- false so this migration can deploy before the client does).
--
-- New error code (P0001): household_required_for_household_expense - the
-- caller has no accepted household partner. Requesting both p_shares and
-- p_is_household_expense in the same call reuses ADR-009's
-- invalid_share_plan (a combination the v1 form never offers; this is the
-- friendly backstop in front of transactions_household_or_shared_exclusive).
-- ---------------------------------------------------------------------------
drop function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid, jsonb);

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
  p_payments jsonb,
  p_refunds_transaction_id uuid default null,
  p_shares jsonb default null,
  p_is_household_expense boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid := p_id;
  v_old public.transactions%rowtype;
  v_old_goal uuid;
  v_purchase public.transactions%rowtype;
  v_purchase_goal uuid;
  v_funding text;
  v_linked_count integer := 0;
  v_linked_total numeric := 0;
  v_linked_first date;
  v_others numeric;
  v_available numeric;
  v_payments_total numeric;
  v_is_shared boolean;
  v_household_partner uuid;
  v_shares_total numeric;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  -- The amount columns are numeric(12,2): from 10^10 up an insert would fail with
  -- a raw numeric overflow, so it is rejected here with the same code as the
  -- other amount checks. Payments add up to p_amount, so this bounds them too.
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount >= 10000000000 then
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

  -- ADR-006: only a reimbursement points to a purchase, and never to itself.
  if p_refunds_transaction_id is not null
     and (p_type <> 'reimbursement' or p_refunds_transaction_id = p_id) then
    raise exception using errcode = 'P0001', message = 'invalid_refund_link';
  end if;

  -- Checked before jsonb_array_length(p_shares) is ever called below: on a
  -- non-array jsonb value that raises a raw Postgres error instead of a
  -- clean P0001, exactly the reason p_payments is typeof-checked first too.
  if p_shares is not null and jsonb_typeof(p_shares) <> 'array' then
    raise exception using errcode = 'P0001', message = 'invalid_share_recipient';
  end if;
  v_is_shared := p_shares is not null and jsonb_array_length(p_shares) > 0;

  -- ADR-010: Case A and Case B are mutually exclusive, and Case B is
  -- expense-only (it has no v1 restriction beyond that - see the migration
  -- header). Case A's own plan restrictions (unchanged from ADR-009).
  if v_is_shared and p_is_household_expense then
    raise exception using errcode = 'P0001', message = 'invalid_share_plan';
  end if;
  if v_is_shared and (p_type <> 'expense' or p_savings_goal_id is not null or p_installment_months <> 1) then
    raise exception using errcode = 'P0001', message = 'invalid_share_plan';
  end if;
  if p_is_household_expense and p_type <> 'expense' then
    raise exception using errcode = 'P0001', message = 'invalid_share_plan';
  end if;

  -- 1. The purchase being refunded. Locked first, so the sum of its
  -- reimbursements read below cannot change under this transaction.
  if p_refunds_transaction_id is not null then
    select * into v_purchase
      from public.transactions
     where id = p_refunds_transaction_id and user_id = v_uid and type = 'expense'
       for update;
    if not found or v_purchase.category_id is null then
      raise exception using errcode = 'P0001', message = 'invalid_refund_link';
    end if;

    -- A shared purchase's amount is split accounting, not a plain expense
    -- figure - refunding it is a later decision, not supported in v1. A
    -- household-tagged purchase (Case B) has no such restriction: it is an
    -- ordinary expense in every way except the tag, so it may be refunded
    -- exactly like a personal one.
    if v_purchase.is_shared then
      raise exception using errcode = 'P0001', message = 'invalid_refund_link';
    end if;

    -- A refund takes the purchase's category: the RPC rejects, never overrides.
    if p_category_id is distinct from v_purchase.category_id then
      raise exception using errcode = 'P0001', message = 'refund_category_mismatch';
    end if;

    if p_date < v_purchase.date then
      raise exception using errcode = 'P0001', message = 'refund_before_purchase';
    end if;

    -- The other reimbursements of this purchase, exact in numeric. The sum is a
    -- later statement than the lock, so under READ COMMITTED it sees whatever a
    -- concurrent save committed first.
    select coalesce(sum(amount), 0) into v_others
      from public.transactions
     where refunds_transaction_id = p_refunds_transaction_id
       and user_id = v_uid
       and id is distinct from v_id;
    if v_others + p_amount > v_purchase.amount then
      raise exception using errcode = 'P0001', message = 'refund_exceeds_purchase',
        detail = (v_purchase.amount - v_others)::text;
    end if;

    -- The Goal that paid the purchase, if any, receives the money back.
    select goal_id into v_purchase_goal
      from public.goal_transfers
     where transaction_id = p_refunds_transaction_id and kind = 'withdrawal';
  end if;

  -- 2. The row being saved and, for a purchase, its linked reimbursements.
  if v_id is not null then
    select * into v_old
      from public.transactions
     where id = v_id and user_id = v_uid
       for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'transaction_not_found';
    end if;
    select goal_id into v_old_goal from public.goal_transfers where transaction_id = v_id;

    if v_old.type = 'expense' then
      perform 1
         from public.transactions
        where refunds_transaction_id = v_id and user_id = v_uid
        order by id
          for update;

      select count(*), coalesce(sum(amount), 0), min(date)
        into v_linked_count, v_linked_total, v_linked_first
        from public.transactions
       where refunds_transaction_id = v_id and user_id = v_uid;

      if v_linked_count > 0 then
        -- What its reimbursements mean depends on these: frozen while any is linked.
        -- Becoming shared (Case A) is frozen too - step 1 already refuses to
        -- link a new reimbursement to a purchase that is shared, so the two
        -- states must never coexist. Case B has no such freeze: a
        -- household-tagged purchase may gain or lose the tag freely even
        -- with reimbursements linked, since nothing about what they mean
        -- depends on it.
        if p_type <> 'expense'
           or p_savings_goal_id is distinct from v_old_goal
           or p_category_id is null
           or v_is_shared then
          raise exception using errcode = 'P0001', message = 'purchase_has_linked_refunds';
        end if;
        if p_amount < v_linked_total then
          raise exception using errcode = 'P0001', message = 'refund_exceeds_purchase',
            detail = v_linked_total::text;
        end if;
        if p_date > v_linked_first then
          raise exception using errcode = 'P0001', message = 'refund_before_purchase';
        end if;
      end if;
    end if;
  end if;

  -- 3. Lock every Goal whose balance can change, in id order, so moving a
  -- withdrawal A -> B concurrently with B -> A cannot deadlock.
  perform 1
     from public.goals
    where id in (v_old_goal, p_savings_goal_id, v_purchase_goal) and user_id = v_uid
    order by id
      for update;

  if p_savings_goal_id is not null
     and not exists (select 1 from public.goals where id = p_savings_goal_id and user_id = v_uid) then
    raise exception using errcode = 'P0001', message = 'goal_not_found';
  end if;

  -- 4. Shared-expense participants and amounts (Case A only). household_member_ids()
  -- always includes the caller (ADR-007), so subtracting v_uid leaves at most
  -- one id: the caller's accepted household partner, or none.
  if v_is_shared then
    select t.uid into v_household_partner
      from public.household_member_ids() as t(uid)
     where t.uid <> v_uid
     limit 1;

    if v_household_partner is null then
      raise exception using errcode = 'P0001', message = 'household_required_for_shared_expense';
    end if;

    if jsonb_array_length(p_shares) <> 2
       or (select count(distinct s ->> 'user_id') from jsonb_array_elements(p_shares) s) <> 2
       or exists (
         select 1
           from jsonb_array_elements(p_shares) s
          where coalesce(s ->> 'user_id', '') = ''
             or (s ->> 'user_id')::uuid not in (v_uid, v_household_partner)
             or jsonb_typeof(s -> 'amount') <> 'number'
             or (s ->> 'amount')::numeric <= 0
             or (s ->> 'amount')::numeric <> round((s ->> 'amount')::numeric, 2)
       ) then
      raise exception using errcode = 'P0001', message = 'invalid_share_recipient';
    end if;

    select sum((s ->> 'amount')::numeric) into v_shares_total from jsonb_array_elements(p_shares) s;
    if v_shares_total <> p_amount then
      raise exception using errcode = 'P0001', message = 'shares_do_not_match_amount';
    end if;
  end if;

  -- 5. Case B: an active household is required (the tag is meaningless
  -- without one), but nothing is written about the partner - there is no
  -- split to record.
  if p_is_household_expense
     and not exists (select 1 from public.household_member_ids() as t(uid) where t.uid <> v_uid) then
    raise exception using errcode = 'P0001', message = 'household_required_for_household_expense';
  end if;

  -- funding_source is derived, never sent by the client: for an expense from the
  -- Goal it names; for a linked reimbursement from how its purchase was paid.
  if p_refunds_transaction_id is not null then
    v_funding := case when v_purchase_goal is null then 'income' else 'savings' end;
  else
    v_funding := case when p_savings_goal_id is null then 'income' else 'savings' end;
  end if;

  if v_id is null then
    insert into public.transactions (
      user_id, description, amount, type, category_id, date, notes, installment_months, funding_source,
      refunds_transaction_id, is_shared, is_household_expense
    )
    values (
      v_uid, p_description, p_amount, p_type, p_category_id, p_date, p_notes, p_installment_months, v_funding,
      p_refunds_transaction_id, v_is_shared, p_is_household_expense
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
           funding_source = v_funding,
           refunds_transaction_id = p_refunds_transaction_id,
           is_shared = v_is_shared,
           is_household_expense = p_is_household_expense
     where id = v_id and user_id = v_uid;

    -- Reimbursements follow their purchase's category.
    if v_linked_count > 0 and p_category_id is distinct from v_old.category_id then
      update public.transactions
         set category_id = p_category_id
       where refunds_transaction_id = v_id and user_id = v_uid;
    end if;
  end if;

  delete from public.transaction_payments where transaction_id = v_id;
  insert into public.transaction_payments (transaction_id, user_id, payment_method, amount)
  select v_id, v_uid, p ->> 'payment_method', (p ->> 'amount')::numeric
    from jsonb_array_elements(p_payments) p;

  delete from public.transaction_shares where transaction_id = v_id;
  if v_is_shared then
    insert into public.transaction_shares (transaction_id, user_id, amount)
    select v_id, (s ->> 'user_id')::uuid, (s ->> 'amount')::numeric
      from jsonb_array_elements(p_shares) s;
  end if;

  -- Undo this transaction's previous transfer first (a withdrawal returns to its
  -- Goal, a refund leaves it), then write the new one. The deferred constraint
  -- raises goal_balance_negative at commit if a Goal no longer has the money a
  -- refund is taking back.
  delete from public.goal_transfers where transaction_id = v_id;

  if p_savings_goal_id is not null then
    select current_amount into v_available from public.goals where id = p_savings_goal_id;
    if v_available < p_amount then
      raise exception using errcode = 'P0001', message = 'insufficient_goal_funds', detail = v_available::text;
    end if;

    insert into public.goal_transfers (user_id, goal_id, kind, amount, date, transaction_id)
    values (v_uid, p_savings_goal_id, 'withdrawal', p_amount, p_date, v_id);
  end if;

  if v_purchase_goal is not null then
    insert into public.goal_transfers (user_id, goal_id, kind, amount, date, transaction_id)
    values (v_uid, v_purchase_goal, 'refund', p_amount, p_date, v_id);
  end if;

  return v_id;
end;
$$;

revoke execute on function public.save_transaction(
  uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid, jsonb, boolean
) from public, anon;
grant execute on function public.save_transaction(
  uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid, jsonb, boolean
) to authenticated;

commit;
