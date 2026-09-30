-- Shared expense split: household-only, exact amounts, RLS visibility, and
-- the ADR-006 interaction (a shared purchase can't be refunded; a purchase
-- with linked refunds can't become shared).
-- See docs/adr/009-shared-expense-split.md.
--
-- Same harness as household_rls.sql / household_partner_profile_rls.sql:
-- checks run under "set local role authenticated" so RLS actually applies,
-- auth.uid() is simulated via the request.jwt.claim(s) GUCs, and every
-- assertion raises on mismatch instead of silently passing. Ends in
-- ROLLBACK; needs at least one row in public.categories.

begin;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_category uuid;
  v_tx uuid;
  v_purchase uuid;
  v_n integer;
  v_is_shared boolean;
  v_code text;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'shared_expense_split: public.categories is empty';
  end if;

  insert into auth.users (id, email) values
    (v_a, 'shared-split-a@example.com'),
    (v_b, 'shared-split-b@example.com'),
    (v_c, 'shared-split-c@example.com');

  execute 'set local role authenticated';

  -- ---------------------------------------------------------------------
  -- 1. No household: sharing is rejected before anything is written.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  begin
    perform public.save_transaction(null, 'Groceries', 100, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":100}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_b, 'amount', 50)));
    raise exception 'shared_expense_split test 1: expected household_required_for_shared_expense, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'household_required_for_shared_expense' then
        raise exception 'shared_expense_split test 1: got %, expected household_required_for_shared_expense', sqlerrm;
      end if;
  end;

  select count(*) into v_n from public.transactions;
  if v_n <> 0 then raise exception 'shared_expense_split test 1: a transaction was written despite the rejection'; end if;

  raise notice 'shared_expense_split: OK (1/7) - sharing without a household is rejected, nothing written';

  -- ---------------------------------------------------------------------
  -- Form the household: A invites B, B accepts.
  -- ---------------------------------------------------------------------
  perform public.invite_household_member('shared-split-b@example.com');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);
  perform public.accept_household_invite();
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  -- ---------------------------------------------------------------------
  -- 2. A valid split: household present, two distinct participants
  --    (caller + partner), amounts sum exactly. Visible to A and B via RLS,
  --    not to C.
  -- ---------------------------------------------------------------------
  select public.save_transaction(null, 'Rent', 1000, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Bank Transfer","amount":1000}]'::jsonb, null,
    jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 600), jsonb_build_object('user_id', v_b, 'amount', 400)))
    into v_tx;

  select is_shared into v_is_shared from public.transactions where id = v_tx;
  if not v_is_shared then raise exception 'shared_expense_split test 2: transactions.is_shared was not set to true'; end if;

  select count(*) into v_n from public.transaction_shares where transaction_id = v_tx;
  if v_n <> 2 then raise exception 'shared_expense_split test 2: A sees % shares rows, expected 2', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);
  select count(*) into v_n from public.transaction_shares where transaction_id = v_tx;
  if v_n <> 2 then raise exception 'shared_expense_split test 2: B sees % shares rows, expected 2', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c)::text, true);
  select count(*) into v_n from public.transaction_shares where transaction_id = v_tx;
  if v_n <> 0 then raise exception 'shared_expense_split test 2: unrelated C sees % shares rows, expected 0', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  raise notice 'shared_expense_split: OK (2/7) - a valid split writes is_shared + 2 rows, visible to the household only';

  -- ---------------------------------------------------------------------
  -- 3. Shares that don't sum to the amount are rejected.
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Groceries', 100, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":100}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_b, 'amount', 40)));
    raise exception 'shared_expense_split test 3: expected shares_do_not_match_amount, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'shares_do_not_match_amount' then
        raise exception 'shared_expense_split test 3: got %, expected shares_do_not_match_amount', sqlerrm;
      end if;
  end;

  raise notice 'shared_expense_split: OK (3/7) - a mismatched split is rejected';

  -- ---------------------------------------------------------------------
  -- 4. A participant who isn't the caller's household partner is rejected.
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Groceries', 100, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":100}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_c, 'amount', 50)));
    raise exception 'shared_expense_split test 4: expected invalid_share_recipient, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'invalid_share_recipient' then
        raise exception 'shared_expense_split test 4: got %, expected invalid_share_recipient', sqlerrm;
      end if;
  end;

  raise notice 'shared_expense_split: OK (4/7) - a non-partner participant is rejected';

  -- ---------------------------------------------------------------------
  -- 5. A shared expense must be a plain income-funded expense: income type,
  --    and savings-funded both rejected with invalid_share_plan.
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Salary', 100, 'income', v_category, current_date, null, 1, null,
      '[{"payment_method":"Bank Transfer","amount":100}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_b, 'amount', 50)));
    raise exception 'shared_expense_split test 5: expected invalid_share_plan (income), no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'invalid_share_plan' then
        raise exception 'shared_expense_split test 5: got %, expected invalid_share_plan, for income type', sqlerrm;
      end if;
  end;

  declare
    v_goal uuid;
  begin
    select public.create_goal('Shared split test goal', 5000, null, 1000, null) into v_goal;
    begin
      perform public.save_transaction(null, 'Laptop', 100, 'expense', v_category, current_date, null, 1, v_goal,
        '[{"payment_method":"Cash","amount":100}]'::jsonb, null,
        jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_b, 'amount', 50)));
      raise exception 'shared_expense_split test 5: expected invalid_share_plan (savings-funded), no error raised';
    exception
      when sqlstate 'P0001' then
        if sqlerrm <> 'invalid_share_plan' then
          raise exception 'shared_expense_split test 5: got %, expected invalid_share_plan, for savings funding', sqlerrm;
        end if;
    end;
  end;

  raise notice 'shared_expense_split: OK (5/7) - income type and savings funding are both rejected for a shared expense';

  -- ---------------------------------------------------------------------
  -- 6. A reimbursement cannot link to a shared purchase (v_tx from test 2).
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Rent refund', 50, 'reimbursement', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":50}]'::jsonb, v_tx);
    raise exception 'shared_expense_split test 6: expected invalid_refund_link, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'invalid_refund_link' then
        raise exception 'shared_expense_split test 6: got %, expected invalid_refund_link', sqlerrm;
      end if;
  end;

  raise notice 'shared_expense_split: OK (6/7) - a reimbursement cannot target a shared purchase';

  -- ---------------------------------------------------------------------
  -- 7. A purchase with a linked reimbursement cannot become shared.
  -- ---------------------------------------------------------------------
  select public.save_transaction(null, 'Shoes', 100, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":100}]'::jsonb) into v_purchase;
  perform public.save_transaction(null, 'Shoes refund', 20, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":20}]'::jsonb, v_purchase);

  begin
    perform public.save_transaction(v_purchase, 'Shoes', 100, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":100}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 50), jsonb_build_object('user_id', v_b, 'amount', 50)));
    raise exception 'shared_expense_split test 7: expected purchase_has_linked_refunds, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'purchase_has_linked_refunds' then
        raise exception 'shared_expense_split test 7: got %, expected purchase_has_linked_refunds', sqlerrm;
      end if;
  end;

  raise notice 'shared_expense_split: OK (7/7) - a purchase with linked refunds cannot become shared';

  execute 'reset role';
end;
$$;

rollback;
