-- Case B (household-tagged expense, no split): household required, mutually
-- exclusive with Case A, and - unlike Case A - free to combine with
-- financing, savings funding and reimbursements.
-- See docs/adr/010-household-expense-tag-and-household-budget.md.
--
-- Same harness as shared_expense_split.sql: checks run under "set local role
-- authenticated" so RLS/grants actually apply, auth.uid() is simulated via
-- the request.jwt.claim(s) GUCs, and every assertion raises on mismatch.
-- Ends in ROLLBACK; needs at least one row in public.categories.

begin;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_category uuid;
  v_goal uuid;
  v_purchase uuid;
  v_tx uuid;
  v_is_household boolean;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'household_expense_tag: public.categories is empty';
  end if;

  insert into auth.users (id, email) values
    (v_a, 'household-expense-tag-a@example.com'),
    (v_b, 'household-expense-tag-b@example.com');

  execute 'set local role authenticated';

  -- ---------------------------------------------------------------------
  -- 1. No household: rejected before anything is written.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  begin
    perform public.save_transaction(null, 'Medicine', 250, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Cash","amount":250}]'::jsonb, null, null, true);
    raise exception 'household_expense_tag test 1: expected household_required_for_household_expense, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'household_required_for_household_expense' then
        raise exception 'household_expense_tag test 1: got %, expected household_required_for_household_expense', sqlerrm;
      end if;
  end;

  -- ---------------------------------------------------------------------
  -- Form the household: A invites B, B accepts.
  -- ---------------------------------------------------------------------
  perform public.invite_household_member('household-expense-tag-b@example.com');
  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);
  perform public.accept_household_invite();
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  -- ---------------------------------------------------------------------
  -- 2. A plain household-tagged expense: no split written, tag set.
  -- ---------------------------------------------------------------------
  select public.save_transaction(null, 'Medicine', 250, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":250}]'::jsonb, null, null, true)
    into v_tx;

  select is_household_expense into v_is_household from public.transactions where id = v_tx;
  if not v_is_household then raise exception 'household_expense_tag test 2: is_household_expense was not set to true'; end if;

  raise notice 'household_expense_tag: OK (1/6) - no household is rejected; a plain household-tagged expense writes the flag with no split';

  -- ---------------------------------------------------------------------
  -- 3. Unlike Case A, Case B can be financed in installments.
  -- ---------------------------------------------------------------------
  perform public.save_transaction(null, 'New fridge', 1200, 'expense', v_category, current_date, null, 6, null,
    '[{"payment_method":"Credit Card","amount":1200}]'::jsonb, null, null, true);

  raise notice 'household_expense_tag: OK (2/6) - a household-tagged expense can be financed in installments';

  -- ---------------------------------------------------------------------
  -- 4. Unlike Case A, Case B can be funded by savings.
  -- ---------------------------------------------------------------------
  select public.create_goal('Household tag test goal', 5000, null, 1000, null) into v_goal;
  perform public.save_transaction(null, 'Plumber', 300, 'expense', v_category, current_date, null, 1, v_goal,
    '[{"payment_method":"Cash","amount":300}]'::jsonb, null, null, true);

  raise notice 'household_expense_tag: OK (3/6) - a household-tagged expense can be funded by savings';

  -- ---------------------------------------------------------------------
  -- 5. Unlike Case A, Case B can receive a reimbursement.
  -- ---------------------------------------------------------------------
  select public.save_transaction(null, 'Shoes', 100, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":100}]'::jsonb, null, null, true)
    into v_purchase;
  perform public.save_transaction(null, 'Shoes refund', 20, 'reimbursement', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":20}]'::jsonb, v_purchase);

  raise notice 'household_expense_tag: OK (4/6) - a reimbursement can target a household-tagged purchase';

  -- ---------------------------------------------------------------------
  -- 6. Mutually exclusive with Case A (both flags in the same call).
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Rent', 1000, 'expense', v_category, current_date, null, 1, null,
      '[{"payment_method":"Bank Transfer","amount":1000}]'::jsonb, null,
      jsonb_build_array(jsonb_build_object('user_id', v_a, 'amount', 500), jsonb_build_object('user_id', v_b, 'amount', 500)),
      true);
    raise exception 'household_expense_tag test 6: expected invalid_share_plan, no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'invalid_share_plan' then
        raise exception 'household_expense_tag test 6: got %, expected invalid_share_plan', sqlerrm;
      end if;
  end;

  raise notice 'household_expense_tag: OK (5/6) - Case A and Case B together in one call are rejected';

  -- ---------------------------------------------------------------------
  -- 7. Case B is expense-only, same as Case A.
  -- ---------------------------------------------------------------------
  begin
    perform public.save_transaction(null, 'Salary', 100, 'income', v_category, current_date, null, 1, null,
      '[{"payment_method":"Bank Transfer","amount":100}]'::jsonb, null, null, true);
    raise exception 'household_expense_tag test 7: expected invalid_share_plan (income), no error raised';
  exception
    when sqlstate 'P0001' then
      if sqlerrm <> 'invalid_share_plan' then
        raise exception 'household_expense_tag test 7: got %, expected invalid_share_plan, for income type', sqlerrm;
      end if;
  end;

  raise notice 'household_expense_tag: OK (6/6) - a household-tagged expense must be type=expense';

  execute 'reset role';
end;
$$;

rollback;
