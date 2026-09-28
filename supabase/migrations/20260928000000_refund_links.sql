-- Link a reimbursement to the purchase it refunds.
-- See docs/adr/006-reimbursement-purchase-links.md.
--
-- Verified against the live database before writing this (pg_constraint,
-- pg_indexes, pg_trigger, information_schema.columns on transactions and
-- goal_transfers): the constraints replaced below exist under these names, and
-- there is no other trigger or index on either table that this touches.
--   transactions: transactions_schedule_expense_only,
--                 transactions_reimbursement_needs_category (kept: a linked
--                 reimbursement always has the purchase's category)
--   goal_transfers: goal_transfers_kind_values,
--                   goal_transfers_withdrawal_linked, goal_transfers_transaction_id_key
--                   (kept: a refund is keyed on the reimbursement, so each
--                   transaction still has at most one transfer)
-- Nothing is backfilled: every existing row keeps a null link, and every
-- existing reimbursement is already funding_source 'income' with one
-- installment, so no figure changes.
--
-- The drops below do not use "if exists" on purpose: if a name differs from what
-- was verified, this aborts instead of silently skipping the rewrite.

begin;

-- ---------------------------------------------------------------------------
-- transactions: the optional link, one reimbursement -> one purchase
-- ---------------------------------------------------------------------------
-- NO ACTION (not RESTRICT) so deleting an account still cascades from
-- auth.users in any order: the check runs at the end of the statement, when the
-- purchase and its reimbursements are already gone together. The constraint is
-- named explicitly because the client recognizes it in a delete error (23503).
alter table public.transactions
  add column refunds_transaction_id uuid,
  add constraint transactions_refunds_transaction_id_fkey
    foreign key (refunds_transaction_id) references public.transactions (id);

create index transactions_refunds_transaction_id_idx
  on public.transactions (refunds_transaction_id)
  where refunds_transaction_id is not null;

-- Only a reimbursement points to a purchase, and never to itself. That the
-- target is an expense of the same user is checked by save_transaction, the
-- only writer.
alter table public.transactions
  add constraint transactions_refund_link_reimbursement_only
    check (refunds_transaction_id is null or (type = 'reimbursement' and refunds_transaction_id <> id));

-- Installments and funding stay expense-only, except that a reimbursement linked
-- to a savings-funded purchase carries funding_source 'savings' (its money
-- returns to a Goal). A 'savings' reimbursement therefore always has a link.
alter table public.transactions
  drop constraint transactions_schedule_expense_only,
  add constraint transactions_schedule_expense_only
    check (
      type = 'expense'
      or (
        installment_months = 1
        and (funding_source = 'income' or (type = 'reimbursement' and refunds_transaction_id is not null))
      )
    );

-- ---------------------------------------------------------------------------
-- goal_transfers: a new kind, 'refund', keyed on the reimbursement
-- ---------------------------------------------------------------------------
-- apply_goal_transfer already adds every kind except 'withdrawal', so the
-- balance trigger is unchanged. RLS is unchanged too: clients can only insert
-- and delete deposits, so refund rows are written only by save_transaction.
alter table public.goal_transfers
  drop constraint goal_transfers_kind_values,
  add constraint goal_transfers_kind_values
    check (kind in ('opening_balance', 'deposit', 'withdrawal', 'refund')),
  drop constraint goal_transfers_withdrawal_linked,
  add constraint goal_transfers_withdrawal_linked
    check ((kind in ('withdrawal', 'refund')) = (transaction_id is not null));

-- ---------------------------------------------------------------------------
-- save_transaction with the link
-- ---------------------------------------------------------------------------
-- The old 10-argument signature is dropped; the new argument has a default, so
-- this migration can be applied before the client is deployed (an old client
-- that edits a linked reimbursement would unlink it).
--
-- Error codes added (all P0001), besides those of ADR-004/005:
--   invalid_refund_link         the target is missing, not the user's, not an
--                               expense, has no category, or is the row itself
--   refund_category_mismatch    the reimbursement's category is not the purchase's
--   refund_before_purchase      dated before the purchase, or moving a purchase
--                               after its earliest reimbursement
--   refund_exceeds_purchase     detail = what can still be refunded (saving a
--                               reimbursement) or what is already refunded (an
--                               expense whose amount would drop below that)
--   purchase_has_linked_refunds type, funding, Goal or category (to none) changed
--                               on a purchase that has linked reimbursements
--
-- Lock order, always: target purchase -> the row being saved and (for a
-- purchase) its linked reimbursements -> Goals in id order. Deleting a
-- reimbursement locks it and then its Goal, which fits the same order.
drop function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb);

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
  p_refunds_transaction_id uuid default null
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
        if p_type <> 'expense'
           or p_savings_goal_id is distinct from v_old_goal
           or p_category_id is null then
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
      refunds_transaction_id
    )
    values (
      v_uid, p_description, p_amount, p_type, p_category_id, p_date, p_notes, p_installment_months, v_funding,
      p_refunds_transaction_id
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
           refunds_transaction_id = p_refunds_transaction_id
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

revoke execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid)
  from public, anon;
grant execute on function public.save_transaction(uuid, text, numeric, text, uuid, date, text, integer, uuid, jsonb, uuid)
  to authenticated;

commit;
