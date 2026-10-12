-- ADR-019, PR 2: activate_recurring_expense, deactivate_recurring_expense
-- and delete_recurring_expense. The idempotency and ownership checks are
-- also covered inline in recurring_expenses.sql's own RPC scenario (test
-- 7/8); this file covers the one case that needs its own fixtures: a flush
-- failure on one template must not block or revert the deactivation of a
-- different one.
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER
-- the recurring_deactivate_rpc migration. It ends in ROLLBACK, so it leaves
-- no data behind. Needs at least one row in public.categories.

begin;

do $$
declare
  v_category uuid;
  v_user uuid := gen_random_uuid();
  v_today date := (now() at time zone 'utc')::date;
  v_goal uuid;
  v_savings_template uuid;
  v_plain_template uuid;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'recurring_deactivate_rpc: public.categories is empty';
  end if;

  insert into auth.users (id) values (v_user);

  -- An underfunded Goal: any withdrawal against it fails with
  -- insufficient_goal_funds (ADR-003/ADR-017).
  insert into public.goals (user_id, name, target_amount, current_amount)
  values (v_user, 'Empty Goal', 1000, 0)
  returning id into v_goal;

  -- Savings-funded template, overdue since January, that can never post
  -- while the Goal stays empty.
  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_user, 1, '2026-01-01')
  returning id into v_savings_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method, savings_goal_id
  )
  values (v_savings_template, v_user, '2026-01-01', 'Underfunded', 50, v_category, 'Card', v_goal);

  -- An unrelated, ordinary template for the same owner, also overdue.
  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_user, 1, '2026-01-01')
  returning id into v_plain_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_plain_template, v_user, '2026-01-01', 'Plain', 20, v_category, 'Card');

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  -- Deactivating the plain template flushes the owner's overdue dates
  -- (owner-scoped, not template-scoped), which also attempts - and fails -
  -- the underfunded template's backlog. That failure must not propagate.
  perform public.deactivate_recurring_expense(v_plain_template, v_today);

  if (select deactivated_since from public.recurring_expenses where id = v_plain_template) <> v_today then
    raise exception 'recurring_deactivate_rpc: deactivating the plain template failed because of an unrelated flush error';
  end if;
  if (select last_error from public.recurring_expenses where id = v_savings_template) is null then
    raise exception 'recurring_deactivate_rpc: the underfunded template''s flush failure was not recorded';
  end if;
  if exists (
    select 1 from public.transactions
     where user_id = v_user and description = 'Underfunded'
  ) then
    raise exception 'recurring_deactivate_rpc: the underfunded template posted a transaction anyway';
  end if;
  if not exists (
    select 1 from public.transactions
     where user_id = v_user and description = 'Plain'
  ) then
    raise exception 'recurring_deactivate_rpc: the plain template''s own backlog was not flushed';
  end if;

  raise notice 'recurring_deactivate_rpc: all checks passed';
end;
$$;

rollback;
