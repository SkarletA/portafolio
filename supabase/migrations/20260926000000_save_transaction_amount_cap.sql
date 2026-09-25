-- save_transaction: reject amounts of 10^10 or more with invalid_amount.
-- See docs/adr/005-money-arithmetic-in-the-client.md.
--
-- The amount columns are numeric(12,2); without this bound an amount that big
-- fails inside the insert with a raw numeric overflow. Same body as the
-- version in 20260923120000_goal_transfers.sql apart from the extra bound.
-- create or replace keeps the function's existing privileges.

begin;

create or replace function public.save_transaction(
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

revoke execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb)
  from public, anon;
grant execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb)
  to authenticated;

commit;
