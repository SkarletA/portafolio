-- ADR-012, PR 2: the single writer. The body of save_transaction moves to
-- private.write_transaction(p_owner, ...), which the recurring-expense posting
-- job (PR 3) can call without a user session. save_transaction keeps its
-- signature and becomes a wrapper that passes auth.uid(). The private schema is
-- not exposed by the API and has no grants to anon or authenticated.
--
-- Behaviour is unchanged for clients. The one difference inside the body is
-- the household partner lookup: private.household_member_ids(p_owner) reads
-- the owner's household instead of auth.uid()'s, with the same result for a
-- session caller.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- The household members of an owner, read as the owner: the owner's accepted
-- household members, and the owner. The same set public.household_member_ids()
-- returns for a session caller (ADR-007), without reading auth.uid().
create function private.household_member_ids(p_owner uuid)
returns setof uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select hm.user_id
    from public.household_members hm
   where hm.household_id = (
           select m.household_id
             from public.household_members m
            where m.user_id = p_owner and m.status = 'accepted'
            limit 1
         )
     and hm.status = 'accepted'
  union
  select p_owner
$function$;

revoke all on function private.household_member_ids(uuid) from public;

-- The writer. The body is the live save_transaction body, with auth.uid()
-- replaced by p_owner and the partner lookups moved to private.household_member_ids.
create function private.write_transaction(
  p_owner uuid,
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
  p_refunds_transaction_id uuid default null::uuid,
  p_shares jsonb default null::jsonb,
  p_is_household_expense boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := p_owner;
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

  -- 4. Shared-expense participants and amounts (Case A only). private.household_member_ids(v_uid)
  -- always includes the owner (ADR-007), so subtracting v_uid leaves at most
  -- one id: the owner's accepted household partner, or none.
  if v_is_shared then
    select t.uid into v_household_partner
      from private.household_member_ids(v_uid) as t(uid)
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
     and not exists (select 1 from private.household_member_ids(v_uid) as t(uid) where t.uid <> v_uid) then
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
$function$;

-- Nothing outside the database calls the writer. Its only caller is
-- save_transaction (owner postgres, security definer) and, from PR 3, the
-- posting job. PUBLIC is revoked explicitly: a new function in a schema without
-- a default ACL is executable by PUBLIC.
revoke all on function private.write_transaction(
  uuid, uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid, jsonb, boolean
) from public;

-- The client entry point keeps its signature (ADR-012, decision 9). It takes the
-- caller from the session and returns the writer's result.
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
  p_payments jsonb,
  p_refunds_transaction_id uuid default null::uuid,
  p_shares jsonb default null::jsonb,
  p_is_household_expense boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  return private.write_transaction(
    auth.uid(), p_id, p_description, p_amount, p_type, p_category_id, p_date, p_notes,
    p_installment_months, p_savings_goal_id, p_payments, p_refunds_transaction_id, p_shares,
    p_is_household_expense
  );
end;
$function$;

commit;
