-- Household RLS: mutual visibility forms only once both members accept, and
-- never reaches anyone outside the household.
-- See docs/adr/007-household-foundations.md.
--
-- Unlike refund_links_account_deletion.sql, which only exercises the
-- security-definer RPCs (they run as their owner regardless of caller role),
-- this script also switches the *session role* to authenticated with
-- "set local role" before every visibility check. Running those checks as
-- the superuser role that owns these tables would bypass RLS entirely
-- (table ownership implies BYPASSRLS-like behavior for it) and every
-- assertion below would pass even if the household policies were broken or
-- missing - exactly the gap this script exists to close. auth.uid() is
-- simulated the same way as the existing test: via the request.jwt.claim(s)
-- GUCs, which are transaction-local state and unaffected by SET LOCAL ROLE.
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER the
-- household_foundations migration. It ends in ROLLBACK, so it leaves no data
-- behind; any failed check raises an exception naming which table and whose
-- view of it was wrong.
--
-- It needs at least one row in public.categories.

begin;

do $$
declare
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
  v_c uuid := gen_random_uuid();
  v_category uuid;
  v_household uuid;
  v_n integer;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'household_rls: public.categories is empty';
  end if;

  -- auth.users is written as the superuser role, same as
  -- refund_links_account_deletion.sql; everything from here on runs as
  -- authenticated, like a real client.
  insert into auth.users (id, email) values
    (v_a, 'household-rls-a@example.com'),
    (v_b, 'household-rls-b@example.com'),
    (v_c, 'household-rls-c@example.com');

  execute 'set local role authenticated';

  -- ---------------------------------------------------------------------
  -- Seed: one transaction (with its payment), one budget and one Goal
  -- (opening balance, so it also produces a goal_transfers row) per user.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);
  perform public.save_transaction(null, 'A expense', 10, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":10}]'::jsonb);
  insert into public.budgets (user_id, category_id, monthly_limit) values (v_a, v_category, 100);
  perform public.create_goal('A goal', 500, null, 20, null);

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);
  perform public.save_transaction(null, 'B expense', 11, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":11}]'::jsonb);
  insert into public.budgets (user_id, category_id, monthly_limit) values (v_b, v_category, 101);
  perform public.create_goal('B goal', 500, null, 21, null);

  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c)::text, true);
  perform public.save_transaction(null, 'C expense', 12, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":12}]'::jsonb);
  insert into public.budgets (user_id, category_id, monthly_limit) values (v_c, v_category, 102);
  perform public.create_goal('C goal', 500, null, 22, null);

  -- ---------------------------------------------------------------------
  -- 1. No household yet: a fresh user's SELECT sees only their own row, in
  --    all five tables. Unfiltered counts, not "contains my row": if RLS
  --    were wide open this would fail by returning 3, not silently pass.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  select count(*) into v_n from public.transactions;
  if v_n <> 1 then raise exception 'household_rls test 1: A sees % transactions, expected 1 (own only)', v_n; end if;
  select count(*) into v_n from public.transaction_payments;
  if v_n <> 1 then raise exception 'household_rls test 1: A sees % transaction_payments, expected 1', v_n; end if;
  select count(*) into v_n from public.budgets;
  if v_n <> 1 then raise exception 'household_rls test 1: A sees % budgets, expected 1', v_n; end if;
  select count(*) into v_n from public.goals;
  if v_n <> 1 then raise exception 'household_rls test 1: A sees % goals, expected 1', v_n; end if;
  select count(*) into v_n from public.goal_transfers;
  if v_n <> 1 then raise exception 'household_rls test 1: A sees % goal_transfers, expected 1', v_n; end if;

  raise notice 'household_rls: OK (1/4) - a fresh user with no household sees only their own rows';

  -- ---------------------------------------------------------------------
  -- 2. A invites B. Before B accepts, both still see only their own rows -
  --    a pending invite grants no access yet, in either direction.
  -- ---------------------------------------------------------------------
  select public.invite_household_member('household-rls-b@example.com') into v_household;

  select count(*) into v_n from public.transactions;
  if v_n <> 1 then raise exception 'household_rls test 2: A (inviter) sees % transactions before acceptance, expected 1', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);

  select count(*) into v_n from public.transactions;
  if v_n <> 1 then raise exception 'household_rls test 2: B (pending invitee) sees % transactions, expected 1', v_n; end if;
  select count(*) into v_n from public.transaction_payments;
  if v_n <> 1 then raise exception 'household_rls test 2: B (pending invitee) sees % transaction_payments, expected 1', v_n; end if;
  select count(*) into v_n from public.budgets;
  if v_n <> 1 then raise exception 'household_rls test 2: B (pending invitee) sees % budgets, expected 1', v_n; end if;
  select count(*) into v_n from public.goals;
  if v_n <> 1 then raise exception 'household_rls test 2: B (pending invitee) sees % goals, expected 1', v_n; end if;
  select count(*) into v_n from public.goal_transfers;
  if v_n <> 1 then raise exception 'household_rls test 2: B (pending invitee) sees % goal_transfers, expected 1', v_n; end if;

  raise notice 'household_rls: OK (2/4) - a pending invite grants no visibility yet';

  -- ---------------------------------------------------------------------
  -- 3. B accepts. A fresh transaction from each proves the visibility is
  --    live, not just the rows seeded before the invite. Both now see the
  --    other's rows and their own, in all five tables - and still nothing
  --    of C's (unfiltered counts: the table holds 5/5/3/3/3 rows in total
  --    across A+B+C, so seeing exactly A+B's share also proves C is excluded).
  -- ---------------------------------------------------------------------
  perform public.accept_household_invite();
  perform public.save_transaction(null, 'B expense after accept', 13, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":13}]'::jsonb);

  perform set_config('request.jwt.claim.sub', v_a::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);
  perform public.save_transaction(null, 'A expense after accept', 14, 'expense', v_category, current_date, null, 1, null,
    '[{"payment_method":"Cash","amount":14}]'::jsonb);

  select count(*) into v_n from public.transactions;
  if v_n <> 4 then raise exception 'household_rls test 3: A sees % transactions, expected 4 (own + B, not C)', v_n; end if;
  select count(*) into v_n from public.transaction_payments;
  if v_n <> 4 then raise exception 'household_rls test 3: A sees % transaction_payments, expected 4', v_n; end if;
  select count(*) into v_n from public.budgets;
  if v_n <> 2 then raise exception 'household_rls test 3: A sees % budgets, expected 2', v_n; end if;
  select count(*) into v_n from public.goals;
  if v_n <> 2 then raise exception 'household_rls test 3: A sees % goals, expected 2', v_n; end if;
  select count(*) into v_n from public.goal_transfers;
  if v_n <> 2 then raise exception 'household_rls test 3: A sees % goal_transfers, expected 2', v_n; end if;

  perform set_config('request.jwt.claim.sub', v_b::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_b)::text, true);

  select count(*) into v_n from public.transactions;
  if v_n <> 4 then raise exception 'household_rls test 3: B sees % transactions, expected 4 (own + A, not C)', v_n; end if;
  select count(*) into v_n from public.transaction_payments;
  if v_n <> 4 then raise exception 'household_rls test 3: B sees % transaction_payments, expected 4', v_n; end if;
  select count(*) into v_n from public.budgets;
  if v_n <> 2 then raise exception 'household_rls test 3: B sees % budgets, expected 2', v_n; end if;
  select count(*) into v_n from public.goals;
  if v_n <> 2 then raise exception 'household_rls test 3: B sees % goals, expected 2', v_n; end if;
  select count(*) into v_n from public.goal_transfers;
  if v_n <> 2 then raise exception 'household_rls test 3: B sees % goal_transfers, expected 2', v_n; end if;

  raise notice 'household_rls: OK (3/4) - accepted members see each other (not a third party) across all five tables';

  -- ---------------------------------------------------------------------
  -- 4. C, unrelated to A or B, sees only C's own rows.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_c::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c)::text, true);

  select count(*) into v_n from public.transactions;
  if v_n <> 1 then raise exception 'household_rls test 4: C sees % transactions, expected 1 (own only)', v_n; end if;
  select count(*) into v_n from public.transaction_payments;
  if v_n <> 1 then raise exception 'household_rls test 4: C sees % transaction_payments, expected 1', v_n; end if;
  select count(*) into v_n from public.budgets;
  if v_n <> 1 then raise exception 'household_rls test 4: C sees % budgets, expected 1', v_n; end if;
  select count(*) into v_n from public.goals;
  if v_n <> 1 then raise exception 'household_rls test 4: C sees % goals, expected 1', v_n; end if;
  select count(*) into v_n from public.goal_transfers;
  if v_n <> 1 then raise exception 'household_rls test 4: C sees % goal_transfers, expected 1', v_n; end if;

  raise notice 'household_rls: OK (4/4) - an unrelated user sees none of the household''s rows';

  execute 'reset role';
end;
$$;

rollback;
