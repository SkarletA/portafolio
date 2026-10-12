-- ADR-019, PR 1: the posting job's deactivate/reactivate floor, and the
-- legacy-cancellation conversion formula from the same migration
-- (20261012100000_recurring_deactivate_schema_and_job.sql). No RPC exists
-- yet for activate/deactivate (PR 2) - templates are inserted and mutated
-- directly, exactly as recurring_expenses.sql already does for its own
-- fixed-date scenarios.
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER
-- the deactivate schema/job migration. It ends in ROLLBACK, so it leaves no
-- data behind. Any failed check raises an exception naming what went wrong.
--
-- Posting uses fixed dates, so tests A-D do not depend on when the test
-- runs. Test E (the conversion formula) uses today's UTC date, because the
-- formula itself compares against current_date.
--
-- It needs at least one row in public.categories.

begin;

do $$
declare
  v_category uuid;
  v_user uuid := gen_random_uuid();
  v_today date := (now() at time zone 'utc')::date;
  v_template uuid;
  v_posted integer;
  v_unposted_count integer;
  v_legacy_past uuid;
  v_legacy_future uuid;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'recurring_deactivate_job: public.categories is empty';
  end if;

  insert into auth.users (id) values (v_user);

  -- A. A deactivated template is skipped entirely, even for a date well
  -- before deactivated_since: the whole-template skip is unconditional
  -- (ADR-019 decision 6), not a second clamp on top of the existing dates.
  insert into public.recurring_expenses (user_id, day_of_month, start_on, deactivated_since)
  values (v_user, 15, '2026-01-15', '2026-02-01')
  returning id into v_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-01-15', 'Streaming', 100, v_category, 'Card');

  v_posted := private.post_due_recurring_occurrences('2026-12-31', v_user);
  if v_posted <> 0 then
    raise exception 'test A: a deactivated template posted % charges, expected 0', v_posted;
  end if;
  if exists (select 1 from public.recurring_occurrences where recurring_expense_id = v_template) then
    raise exception 'test A: a deactivated template produced an occurrence row';
  end if;

  -- B. active_from is a floor: nothing before it posts, everything at or
  -- after it posts normally (ADR-019 decision 4).
  insert into public.recurring_expenses (user_id, day_of_month, start_on, active_from)
  values (v_user, 15, '2026-01-15', '2026-04-16')
  returning id into v_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-01-15', 'Streaming', 100, v_category, 'Card');

  v_posted := private.post_due_recurring_occurrences('2026-12-31', v_user);
  if v_posted <> 8 then
    raise exception 'test B: posted %, expected 8 (May through Dec)', v_posted;
  end if;
  if exists (
    select 1 from public.recurring_occurrences
     where recurring_expense_id = v_template and scheduled_date < '2026-04-16'
  ) then
    raise exception 'test B: a date before active_from was posted';
  end if;

  -- C. Two full deactivate/reactivate cycles leave only the latest
  -- active_from in effect - no memory of the first pause window, no growth
  -- (ADR-019 decision 5). Columns are overwritten directly here, exactly as
  -- the activate/deactivate RPCs (PR 2) will overwrite them.
  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_user, 1, '2026-01-01')
  returning id into v_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-01-01', 'Gym', 100, v_category, 'Card');

  -- Cycle 1: deactivate after Feb, reactivate with a May 1 floor.
  update public.recurring_expenses set deactivated_since = '2026-03-01' where id = v_template;
  update public.recurring_expenses set deactivated_since = null, active_from = '2026-05-01' where id = v_template;
  -- Cycle 2: deactivate again, reactivate with a September 1 floor.
  update public.recurring_expenses set deactivated_since = '2026-07-01' where id = v_template;
  update public.recurring_expenses set deactivated_since = null, active_from = '2026-09-01' where id = v_template;

  v_posted := private.post_due_recurring_occurrences('2026-12-31', v_user);
  if v_posted <> 4 then
    raise exception 'test C: posted %, expected 4 (Sep through Dec, only the latest floor)', v_posted;
  end if;
  if exists (
    select 1 from public.recurring_occurrences
     where recurring_expense_id = v_template and scheduled_date < '2026-09-01'
  ) then
    raise exception 'test C: a date before the latest active_from was posted';
  end if;

  -- D. A template with both new columns null behaves exactly as before
  -- this ADR (regression).
  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_user, 31, '2026-01-31')
  returning id into v_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-01-31', 'Streaming', 100, v_category, 'Card');

  v_posted := private.post_due_recurring_occurrences('2026-03-31', v_user);
  if v_posted <> 3 then
    raise exception 'test D: posted %, expected 3 (Jan 31, Feb 28, Mar 31) - regression', v_posted;
  end if;

  -- E. The legacy-cancellation conversion formula (the migration's own
  -- UPDATE, re-run here against two fresh fixture rows so it only touches
  -- them): an effective stop date already in the past converts to
  -- deactivated; one today or in the future converts to an active template
  -- with a planned end, never stopping it earlier than it was committed to.
  insert into public.recurring_expenses (user_id, day_of_month, start_on, ended_on)
  values (v_user, 10, v_today - 90, v_today - 5)
  returning id into v_legacy_past;

  insert into public.recurring_expenses (user_id, day_of_month, start_on, ended_on, planned_end_on)
  values (v_user, 10, v_today - 90, v_today + 10, v_today + 3)
  returning id into v_legacy_future;

  update public.recurring_expenses
  set
    deactivated_since = case
      when least(ended_on, coalesce(planned_end_on, ended_on)) < current_date
      then least(ended_on, coalesce(planned_end_on, ended_on))
    end,
    planned_end_on = case
      when least(ended_on, coalesce(planned_end_on, ended_on)) >= current_date
      then least(ended_on, coalesce(planned_end_on, ended_on))
    end,
    ended_on = null
  where id in (v_legacy_past, v_legacy_future);

  if (select (deactivated_since, planned_end_on, ended_on) from public.recurring_expenses where id = v_legacy_past)
     is distinct from (v_today - 5, null, null) then
    raise exception 'test E: a legacy template with a past stop date did not convert to deactivated';
  end if;

  if (select (deactivated_since, planned_end_on, ended_on) from public.recurring_expenses where id = v_legacy_future)
     is distinct from (null, v_today + 3, null) then
    raise exception 'test E: a legacy template with a future stop date did not convert to a planned end';
  end if;

  raise notice 'recurring_deactivate_job: all checks passed';
end;
$$;

rollback;
