-- Recurring expenses: the posting job and the client RPCs (ADR-012, PR 3).
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER the
-- recurring_posting migration. It ends in ROLLBACK, so it leaves no data behind.
-- Any failed check raises an exception naming what went wrong.
--
-- Posting uses fixed dates, so its results do not depend on when the test runs.
-- The RPC checks use today's UTC date, because they accept only a local date
-- within a day of it (ADR-013).
--
-- It needs at least one row in public.categories.

begin;

do $$
declare
  v_category uuid;
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_today date := (now() at time zone 'utc')::date;
  v_template uuid;
  v_cancel_template uuid;
  v_gym uuid;
  v_posted integer;
  v_last_error text;
  v_error text;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'recurring_expenses: public.categories is empty';
  end if;

  insert into auth.users (id) values (v_user), (v_other);

  -- Historical template, inserted directly so the schedule is fixed.
  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_user, 31, '2026-01-31')
  returning id into v_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-01-31', 'Streaming', 100, v_category, 'Card');

  -- 1. Catch-up: each missed date posts on its own scheduled date (month end clamped).
  v_posted := private.post_due_recurring_occurrences('2026-03-31', v_user);
  if v_posted <> 3 then
    raise exception 'recurring test 1: posted %, expected 3 (Jan 31, Feb 28, Mar 31)', v_posted;
  end if;
  if (select array_agg(date order by date) from public.transactions where user_id = v_user)
     <> array['2026-01-31', '2026-02-28', '2026-03-31']::date[] then
    raise exception 'recurring test 1: posted dates are not the scheduled dates';
  end if;

  -- 2. Idempotent: a second run over the same window posts nothing.
  v_posted := private.post_due_recurring_occurrences('2026-03-31', v_user);
  if v_posted <> 0 then
    raise exception 'recurring test 2: second run posted %, expected 0', v_posted;
  end if;

  -- 3. Deleting a posted charge leaves its occurrence as a tombstone, so it is not regenerated.
  delete from public.transactions where user_id = v_user and date = '2026-02-28';
  v_posted := private.post_due_recurring_occurrences('2026-03-31', v_user);
  if v_posted <> 0 then
    raise exception 'recurring test 3: a deleted charge was regenerated (posted %)', v_posted;
  end if;
  if not exists (
    select 1 from public.recurring_occurrences
     where recurring_expense_id = v_template and scheduled_date = '2026-02-28' and transaction_id is null
  ) then
    raise exception 'recurring test 3: tombstone for 2026-02-28 is missing';
  end if;

  -- 4. A term effective on a future date applies from that date, and posted charges keep theirs.
  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-04-01', 'Streaming', 150, v_category, 'Card');

  v_posted := private.post_due_recurring_occurrences('2026-04-30', v_user);
  if v_posted <> 1 then
    raise exception 'recurring test 4: posted %, expected 1 (Apr 30)', v_posted;
  end if;
  if (select amount from public.transactions where user_id = v_user and date = '2026-04-30') <> 150 then
    raise exception 'recurring test 4: April did not use the term effective 2026-04-01';
  end if;
  if (select amount from public.transactions where user_id = v_user and date = '2026-01-31') <> 100 then
    raise exception 'recurring test 4: a posted January charge was rewritten by a later term';
  end if;

  -- 5. A failing date rolls back its occurrence and its transaction, records last_error,
  -- and the next run posts it once the cause is gone. The failure is injected with a
  -- CHECK on transaction_payments, which this transaction rolls back at the end.
  alter table public.transaction_payments
    add constraint tmp_recurring_test_fail check (payment_method <> 'Broken');

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_template, v_user, '2026-05-01', 'Streaming', 160, v_category, 'Broken');

  v_posted := private.post_due_recurring_occurrences('2026-05-31', v_user);
  if v_posted <> 0 then
    raise exception 'recurring test 5: a failing charge was posted';
  end if;
  select last_error into v_last_error from public.recurring_expenses where id = v_template;
  if v_last_error is null then
    raise exception 'recurring test 5: last_error was not recorded';
  end if;
  if exists (
    select 1 from public.recurring_occurrences
     where recurring_expense_id = v_template and scheduled_date = '2026-05-31'
  ) then
    raise exception 'recurring test 5: the occurrence of a failed date was not rolled back';
  end if;

  alter table public.transaction_payments drop constraint tmp_recurring_test_fail;

  v_posted := private.post_due_recurring_occurrences('2026-05-31', v_user);
  if v_posted <> 1 then
    raise exception 'recurring test 5: retry posted %, expected 1', v_posted;
  end if;
  if (select last_error from public.recurring_expenses where id = v_template) is not null then
    raise exception 'recurring test 5: last_error was not cleared after the retry';
  end if;

  -- 6. A cancelled template stops at its end date: January to May post, June 30 does not.
  insert into public.recurring_expenses (user_id, day_of_month, start_on, ended_on)
  values (v_other, 31, '2026-01-31', '2026-06-10')
  returning id into v_cancel_template;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_cancel_template, v_other, '2026-01-31', 'Gym', 100, v_category, 'Card');

  v_posted := private.post_due_recurring_occurrences('2026-12-31', v_other);
  if v_posted <> 5 then
    raise exception 'recurring test 6: posted %, expected 5 (Jan to May)', v_posted;
  end if;
  if exists (
    select 1 from public.transactions where user_id = v_other and date >= '2026-06-01'
  ) then
    raise exception 'recurring test 6: a charge after the end date was posted';
  end if;

  -- 7. The client RPCs, as the first user.
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  -- Creating starts tomorrow, with term version 1 on the same date.
  v_gym := public.create_recurring_expense('Gym', 300, v_category, 'Card', 5, v_today);
  if (select start_on from public.recurring_expenses where id = v_gym) <> v_today + 1 then
    raise exception 'recurring test 7: create did not start tomorrow';
  end if;

  -- Amounts follow ADR-005: two decimals at most.
  begin
    perform public.create_recurring_expense('Bad', 10.005, v_category, 'Card', 5, v_today);
    raise exception 'recurring test 7: 10.005 was accepted';
  exception when others then
    if sqlerrm <> 'invalid_amount' then
      raise exception 'recurring test 7: expected invalid_amount, got %', sqlerrm;
    end if;
  end;

  -- A date outside the local-today window is refused.
  begin
    perform public.create_recurring_expense('Old', 10, v_category, 'Card', 5, v_today - 5);
    raise exception 'recurring test 7: a stale date was accepted';
  exception when others then
    if sqlerrm <> 'invalid_date' then
      raise exception 'recurring test 7: expected invalid_date, got %', sqlerrm;
    end if;
  end;

  -- An edit must take effect in the future.
  begin
    perform public.update_recurring_expense(v_gym, v_today, 'Gym', 310, v_category, 'Card', v_today);
    raise exception 'recurring test 7: an edit effective today was accepted';
  exception when others then
    if sqlerrm <> 'effective_date_not_future' then
      raise exception 'recurring test 7: expected effective_date_not_future, got %', sqlerrm;
    end if;
  end;

  perform public.update_recurring_expense(v_gym, v_today + 40, 'Gym', 310, v_category, 'Card', v_today);
  if (select count(*) from public.recurring_expense_terms where recurring_expense_id = v_gym) <> 2 then
    raise exception 'recurring test 7: an edit did not add a term version';
  end if;

  -- Cancel once. A second cancel is refused.
  perform public.cancel_recurring_expense(v_gym, v_today + 100, v_today);
  begin
    perform public.cancel_recurring_expense(v_gym, v_today + 100, v_today);
    raise exception 'recurring test 7: a second cancel was accepted';
  exception when others then
    if sqlerrm <> 'recurring_already_cancelled' then
      raise exception 'recurring test 7: expected recurring_already_cancelled, got %', sqlerrm;
    end if;
  end;

  -- Editing a cancelled template is refused.
  begin
    perform public.update_recurring_expense(v_gym, v_today + 60, 'Gym', 320, v_category, 'Card', v_today);
    raise exception 'recurring test 7: an edit of a cancelled template was accepted';
  exception when others then
    if sqlerrm <> 'recurring_ended' then
      raise exception 'recurring test 7: expected recurring_ended, got %', sqlerrm;
    end if;
  end;

  -- Another user's template is invisible to these RPCs.
  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_other)::text, true);
  begin
    perform public.cancel_recurring_expense(v_template, v_today + 100, v_today);
    raise exception 'recurring test 7: another user cancelled a template';
  exception when others then
    if sqlerrm <> 'recurring_not_found' then
      raise exception 'recurring test 7: expected recurring_not_found, got %', sqlerrm;
    end if;
  end;

  -- Post now, as the first user, publishes only dates before today and never the new template's future charge.
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);
  v_posted := public.post_my_recurring_expenses(v_today);
  if exists (
    select 1 from public.recurring_occurrences where user_id = v_user and scheduled_date >= v_today
  ) then
    raise exception 'recurring test 7: post now published a date that is not yet due';
  end if;

  raise notice 'recurring_expenses: all checks passed';
end;
$$;

rollback;
