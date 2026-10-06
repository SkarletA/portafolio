-- ADR-012, PR 3: the posting job, the client RPCs and the pg_cron schedule.
--
-- What it does, in order:
--   1. Installs pg_cron in pg_catalog (idempotent). If the project refuses the
--      extension, this migration stops with an error and changes nothing; the
--      extension can then be enabled from Database > Extensions and the
--      migration run again.
--   2. Creates the posting function (private, no client grants), the scheduled-
--      date helper, the term validator and the local-date guard.
--   3. Creates the four client RPCs: create, update and cancel a template, and
--      "post now" for the user's own overdue charges.
--   4. Schedules two cron jobs with cron.schedule. Re-running this migration
--      unschedules them first, so it never leaves a duplicate.
--
-- Reverting the schedule: cron.unschedule('post-recurring-occurrences') and
-- cron.unschedule('cleanup-recurring-cron-history'). Never drop the pg_cron
-- extension: that deletes every scheduled job, not only these two.

begin;

create extension if not exists pg_cron with schema pg_catalog;

-- The date of day `p_day` in the month of `p_any_day_in_month`, clamped to that
-- month's last day (ADR-012, decision 4). Anchored on the configured day, never
-- chained from a previous month.
create function private.scheduled_date(p_any_day_in_month date, p_day integer)
returns date
language sql
immutable
set search_path to ''
as $function$
  with month_start as (
    select make_date(extract(year from p_any_day_in_month)::int, extract(month from p_any_day_in_month)::int, 1) as first_day
  )
  select (m.first_day + (least(p_day, extract(day from (m.first_day + interval '1 month - 1 day'))::int) - 1))::date
    from month_start m
$function$;

-- The client's "today" is a local calendar date (ADR-013). It may differ from the
-- UTC date by at most a day in either direction. Anything else is refused, so a
-- client cannot pull future charges forward or claim a stale date.
create function private.assert_local_today(p_today date)
returns void
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_utc_today date := (now() at time zone 'utc')::date;
begin
  if p_today is null or p_today < v_utc_today - 1 or p_today > v_utc_today + 1 then
    raise exception using errcode = 'P0001', message = 'invalid_date';
  end if;
end;
$function$;

-- The fields a template's terms need. The database CHECKs are the backstop;
-- these named errors are what the client maps to messages.
create function private.assert_recurring_terms(
  p_description text,
  p_amount numeric,
  p_category_id uuid,
  p_payment_method text
)
returns void
language plpgsql
stable
set search_path to ''
as $function$
begin
  if p_description is null or btrim(p_description) = '' then
    raise exception using errcode = 'P0001', message = 'invalid_description';
  end if;

  -- ADR-005, Amendment 2: positive, at most two decimals, below 10^10.
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount >= 10000000000 then
    raise exception using errcode = 'P0001', message = 'invalid_amount';
  end if;

  if p_payment_method is null or btrim(p_payment_method) = '' then
    raise exception using errcode = 'P0001', message = 'invalid_payment_method';
  end if;

  if p_category_id is null or not exists (select 1 from public.categories where id = p_category_id) then
    raise exception using errcode = 'P0001', message = 'invalid_category';
  end if;
end;
$function$;

-- The posting job. For every active template (or only p_owner's) it posts each
-- monthly date from start_on through min(p_as_of, ended_on) that has no
-- occurrence row, with the terms in force on that date. Each date runs in its
-- own block: the occurrence row and the transaction are written together, or not
-- at all. A failed date sets last_error and is retried by the next run.
-- Returns the number of transactions posted by this call.
create function private.post_due_recurring_occurrences(p_as_of date, p_owner uuid default null)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_template record;
  v_term public.recurring_expense_terms%rowtype;
  v_limit date;
  v_first_month date;
  v_months integer;
  v_date date;
  v_occurrence_id uuid;
  v_transaction_id uuid;
  v_failed boolean;
  v_posted integer := 0;
begin
  for v_template in
    select re.id, re.user_id, re.day_of_month, re.start_on, re.ended_on, re.last_error
      from public.recurring_expenses re
     where p_owner is null or re.user_id = p_owner
     order by re.id
       for update skip locked
  loop
    v_failed := false;
    v_limit := least(p_as_of, coalesce(v_template.ended_on, p_as_of));
    v_first_month := make_date(extract(year from v_template.start_on)::int, extract(month from v_template.start_on)::int, 1);
    v_months := (extract(year from v_limit)::int - extract(year from v_first_month)::int) * 12
              + (extract(month from v_limit)::int - extract(month from v_first_month)::int);

    for i in 0..v_months loop
      v_date := private.scheduled_date((v_first_month + make_interval(months => i))::date, v_template.day_of_month);
      continue when v_date < v_template.start_on or v_date > v_limit;

      begin
        select * into v_term
          from public.recurring_expense_terms
         where recurring_expense_id = v_template.id and effective_from <= v_date
         order by effective_from desc
         limit 1;
        continue when not found;

        -- The occurrence row comes first. A date that already has one (posted, or
        -- deleted by the user, which leaves the row with transaction_id null) is
        -- skipped, so it is never posted twice.
        insert into public.recurring_occurrences (recurring_expense_id, user_id, scheduled_date, term_version_id)
        values (v_template.id, v_template.user_id, v_date, v_term.id)
        on conflict (recurring_expense_id, scheduled_date) do nothing
        returning id into v_occurrence_id;
        continue when v_occurrence_id is null;

        v_transaction_id := private.write_transaction(
          v_template.user_id, null, v_term.description, v_term.amount, 'expense', v_term.category_id,
          v_date, null, 1, null,
          jsonb_build_array(jsonb_build_object('payment_method', v_term.payment_method, 'amount', v_term.amount)),
          null, null, false
        );

        update public.recurring_occurrences
           set transaction_id = v_transaction_id
         where id = v_occurrence_id;

        v_posted := v_posted + 1;
      exception when others then
        -- The block's writes are rolled back. Record the error outside the block
        -- and continue with the template's other dates.
        v_failed := true;
        update public.recurring_expenses
           set last_error = sqlerrm, last_error_at = now()
         where id = v_template.id;
      end;
    end loop;

    if not v_failed and v_template.last_error is not null then
      update public.recurring_expenses
         set last_error = null, last_error_at = null
       where id = v_template.id;
    end if;
  end loop;

  return v_posted;
end;
$function$;

-- Client RPCs. Each runs as the owner, takes the caller from auth.uid(), and only
-- touches rows whose user_id is the caller. Anything else is recurring_not_found.

create function public.create_recurring_expense(
  p_description text,
  p_amount numeric,
  p_category_id uuid,
  p_payment_method text,
  p_day_of_month integer,
  p_today date
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_start date;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform private.assert_local_today(p_today);
  perform private.assert_recurring_terms(p_description, p_amount, p_category_id, p_payment_method);

  if p_day_of_month is null or p_day_of_month not between 1 and 31 then
    raise exception using errcode = 'P0001', message = 'invalid_day_of_month';
  end if;

  -- Nothing is backfilled: the first charge is the first scheduled date after today.
  v_start := p_today + 1;

  insert into public.recurring_expenses (user_id, day_of_month, start_on)
  values (v_uid, p_day_of_month, v_start)
  returning id into v_id;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
  )
  values (v_id, v_uid, v_start, p_description, p_amount, p_category_id, p_payment_method);

  return v_id;
end;
$function$;

create function public.update_recurring_expense(
  p_id uuid,
  p_effective_from date,
  p_description text,
  p_amount numeric,
  p_category_id uuid,
  p_payment_method text,
  p_today date
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_template public.recurring_expenses%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform private.assert_local_today(p_today);
  perform private.assert_recurring_terms(p_description, p_amount, p_category_id, p_payment_method);

  -- Lock the template so two edits or an edit and a cancel cannot interleave.
  select * into v_template
    from public.recurring_expenses
   where id = p_id and user_id = v_uid
     for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'recurring_not_found';
  end if;

  if v_template.ended_on is not null then
    raise exception using errcode = 'P0001', message = 'recurring_ended';
  end if;

  -- Only a change that starts in the future. Charges already due keep their terms.
  if p_effective_from is null or p_effective_from <= p_today then
    raise exception using errcode = 'P0001', message = 'effective_date_not_future';
  end if;

  begin
    insert into public.recurring_expense_terms (
      recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method
    )
    values (p_id, v_uid, p_effective_from, p_description, p_amount, p_category_id, p_payment_method);
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'recurring_term_conflict';
  end;

  return p_id;
end;
$function$;

create function public.cancel_recurring_expense(p_id uuid, p_ended_on date, p_today date)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_template public.recurring_expenses%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform private.assert_local_today(p_today);

  select * into v_template
    from public.recurring_expenses
   where id = p_id and user_id = v_uid
     for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'recurring_not_found';
  end if;

  if v_template.ended_on is not null then
    raise exception using errcode = 'P0001', message = 'recurring_already_cancelled';
  end if;

  if p_ended_on is null or p_ended_on < p_today then
    raise exception using errcode = 'P0001', message = 'ended_before_today';
  end if;

  update public.recurring_expenses
     set ended_on = p_ended_on
   where id = p_id;
end;
$function$;

-- "Post now": publishes the caller's own charges whose date is before the local
-- today. The cutoff is p_today - 1, so today's charge waits for the scheduled run
-- (18:00 in Mexico City, ADR-012, decision 12).
create function public.post_my_recurring_expenses(p_today date)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  perform private.assert_local_today(p_today);

  return private.post_due_recurring_occurrences(p_today - 1, v_uid);
end;
$function$;

-- Grants. Functions in public are executable by anon and authenticated by default,
-- and functions in private by PUBLIC. Client RPCs go to authenticated only; the
-- private functions have no client grants at all.
revoke all on function private.scheduled_date(date, integer) from public;
revoke all on function private.assert_local_today(date) from public;
revoke all on function private.assert_recurring_terms(text, numeric, uuid, text) from public;
revoke all on function private.post_due_recurring_occurrences(date, uuid) from public;

revoke all on function public.create_recurring_expense(text, numeric, uuid, text, integer, date) from public, anon;
revoke all on function public.update_recurring_expense(uuid, date, text, numeric, uuid, text, date) from public, anon;
revoke all on function public.cancel_recurring_expense(uuid, date, date) from public, anon;
revoke all on function public.post_my_recurring_expenses(date) from public, anon;

grant execute on function public.create_recurring_expense(text, numeric, uuid, text, integer, date) to authenticated;
grant execute on function public.update_recurring_expense(uuid, date, text, numeric, uuid, text, date) to authenticated;
grant execute on function public.cancel_recurring_expense(uuid, date, date) to authenticated;
grant execute on function public.post_my_recurring_expenses(date) to authenticated;

-- Schedules. cron.schedule runs the command as postgres, which owns the functions.
do $schedule$
begin
  if exists (select 1 from cron.job where jobname = 'post-recurring-occurrences') then
    perform cron.unschedule('post-recurring-occurrences');
  end if;

  perform cron.schedule(
    'post-recurring-occurrences',
    '0 * * * *',
    $cmd$select private.post_due_recurring_occurrences((now() at time zone 'utc')::date - 1)$cmd$
  );

  if exists (select 1 from cron.job where jobname = 'cleanup-recurring-cron-history') then
    perform cron.unschedule('cleanup-recurring-cron-history');
  end if;

  perform cron.schedule(
    'cleanup-recurring-cron-history',
    '0 4 * * 0',
    $cmd$delete from cron.job_run_details where end_time < now() - interval '7 days'$cmd$
  );
end;
$schedule$;

commit;
