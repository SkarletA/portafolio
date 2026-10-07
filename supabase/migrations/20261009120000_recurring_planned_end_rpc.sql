-- ADR-016, RPCs and job: a planned end (fixed count or fixed date) for
-- recurring expenses.
--
-- Refinement on the ADR text: a charge count is translated into a date by
-- the CLIENT (domain/recurring.ts's getNthScheduledDate), not by this
-- migration's SQL. The job already has to skip a candidate date that falls
-- before start_on (when day_of_month is earlier in the month than
-- start_on's own day - see private.post_due_recurring_occurrences's
-- "continue when v_date < start_on"); replicating that same skip rule in
-- plpgsql month arithmetic would duplicate logic that already exists,
-- tested, in the pure domain layer. The database's job stays what it
-- already is elsewhere (ADR-005's own rule for the client boundary):
-- validate the date it is given, never recompute it. planned_charges is
-- accepted purely as a display label alongside the date the client already
-- computed - it is never used to derive anything server-side.

begin;

-- ADR-016: planned_charges, if given, must come with the date the client
-- computed from it (never alone - there is nothing to derive it from
-- server-side, by design). The date itself must not be in the past, and
-- the count, if given, is capped at 600 (50 years). The table's own CHECKs
-- are the backstop; this named error is what the client maps to a message.
create function private.assert_recurring_planned_end(p_planned_end_on date, p_planned_charges integer, p_earliest date)
returns void
language plpgsql
stable
set search_path to ''
as $function$
begin
  if p_planned_charges is not null and p_planned_end_on is null then
    raise exception using errcode = 'P0001', message = 'invalid_planned_end';
  end if;

  if p_planned_charges is not null and p_planned_charges not between 1 and 600 then
    raise exception using errcode = 'P0001', message = 'invalid_planned_end';
  end if;

  if p_planned_end_on is not null and p_planned_end_on < p_earliest then
    raise exception using errcode = 'P0001', message = 'invalid_planned_end';
  end if;
end;
$function$;

revoke all on function private.assert_recurring_planned_end(date, integer, date) from public;

create or replace function public.create_recurring_expense(
  p_description text,
  p_amount numeric,
  p_category_id uuid,
  p_payment_method text,
  p_day_of_month integer,
  p_today date,
  p_is_shared boolean default false,
  p_owner_share_amount numeric default null,
  p_is_household_expense boolean default false,
  p_savings_goal_id uuid default null,
  p_planned_end_on date default null,
  p_planned_charges integer default null
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
  perform private.assert_recurring_share(p_is_shared, p_owner_share_amount, p_amount);

  if p_day_of_month is null or p_day_of_month not between 1 and 31 then
    raise exception using errcode = 'P0001', message = 'invalid_day_of_month';
  end if;

  if p_is_shared and p_is_household_expense then
    raise exception using errcode = 'P0001', message = 'invalid_share_plan';
  end if;

  if p_is_shared and p_savings_goal_id is not null then
    raise exception using errcode = 'P0001', message = 'invalid_share_plan';
  end if;

  if p_is_shared
     and not exists (select 1 from private.household_member_ids(v_uid) as t(uid) where t.uid <> v_uid) then
    raise exception using errcode = 'P0001', message = 'household_required_for_shared_expense';
  end if;

  if p_is_household_expense
     and not exists (select 1 from private.household_member_ids(v_uid) as t(uid) where t.uid <> v_uid) then
    raise exception using errcode = 'P0001', message = 'household_required_for_household_expense';
  end if;

  if p_savings_goal_id is not null
     and not exists (select 1 from public.goals where id = p_savings_goal_id and user_id = v_uid) then
    raise exception using errcode = 'P0001', message = 'goal_not_found';
  end if;

  -- Nothing is backfilled: the first charge is the first scheduled date after today.
  v_start := p_today + 1;

  perform private.assert_recurring_planned_end(p_planned_end_on, p_planned_charges, v_start);

  insert into public.recurring_expenses (user_id, day_of_month, start_on, planned_end_on, planned_charges)
  values (v_uid, p_day_of_month, v_start, p_planned_end_on, p_planned_charges)
  returning id into v_id;

  insert into public.recurring_expense_terms (
    recurring_expense_id, user_id, effective_from, description, amount, category_id, payment_method,
    is_shared, owner_share_amount, is_household_expense, savings_goal_id
  )
  values (
    v_id, v_uid, v_start, p_description, p_amount, p_category_id, p_payment_method,
    p_is_shared, p_owner_share_amount, p_is_household_expense, p_savings_goal_id
  );

  return v_id;
end;
$function$;

revoke all on function public.create_recurring_expense(text, numeric, uuid, text, integer, date, boolean, numeric, boolean, uuid, date, integer) from public, anon;
grant execute on function public.create_recurring_expense(text, numeric, uuid, text, integer, date, boolean, numeric, boolean, uuid, date, integer) to authenticated;

-- A planned end is not a financial term: update_recurring_expense is
-- unchanged (it keeps inserting a new term version only for
-- description/amount/category/payment/share/household/savings). This is a
-- new, small RPC that mutates two plain columns, the same precedent
-- cancel_recurring_expense already is. Editable any time the template
-- itself still is (ended_on is null); passing both parameters as null
-- removes the planned end. Takes effect immediately - it only ever affects
-- dates that have not posted yet, so no effective_from is needed.
create function public.set_recurring_expense_planned_end(
  p_id uuid,
  p_planned_end_on date default null,
  p_planned_charges integer default null,
  p_today date default null
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
  perform private.assert_recurring_planned_end(p_planned_end_on, p_planned_charges, p_today);

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

  if p_planned_end_on is not null and p_planned_end_on < v_template.start_on then
    raise exception using errcode = 'P0001', message = 'invalid_planned_end';
  end if;

  update public.recurring_expenses
     set planned_end_on = p_planned_end_on,
         planned_charges = p_planned_charges
   where id = p_id;

  return p_id;
end;
$function$;

revoke all on function public.set_recurring_expense_planned_end(uuid, date, integer, date) from public, anon;
grant execute on function public.set_recurring_expense_planned_end(uuid, date, integer, date) to authenticated;

-- The posting job. Unchanged except for v_limit, which now also clamps to
-- planned_end_on - whichever end is sooner governs, mechanically, with no
-- branch deciding "which wins" (ADR-016, decision 3). Never writes
-- planned_end_on or ended_on: reaching the planned end is the absence of a
-- future candidate date past the clamp, not a mutation.
create or replace function private.post_due_recurring_occurrences(p_as_of date, p_owner uuid default null)
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
  v_partner uuid;
  v_shares jsonb;
  v_is_household_expense boolean;
  v_posted_without_household boolean;
begin
  for v_template in
    select re.id, re.user_id, re.day_of_month, re.start_on, re.ended_on, re.planned_end_on, re.last_error
      from public.recurring_expenses re
     where p_owner is null or re.user_id = p_owner
     order by re.id
       for update skip locked
  loop
    v_failed := false;
    v_limit := least(
      p_as_of,
      coalesce(v_template.ended_on, p_as_of),
      coalesce(v_template.planned_end_on, p_as_of)
    );
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

        v_shares := null;
        v_is_household_expense := false;
        v_posted_without_household := false;
        if v_term.is_shared or v_term.is_household_expense then
          select t.uid into v_partner
            from private.household_member_ids(v_template.user_id) as t(uid)
           where t.uid <> v_template.user_id
           limit 1;

          if v_partner is not null then
            if v_term.is_shared then
              v_shares := jsonb_build_array(
                jsonb_build_object('user_id', v_template.user_id, 'amount', v_term.owner_share_amount),
                jsonb_build_object('user_id', v_partner, 'amount', v_term.amount - v_term.owner_share_amount)
              );
            else
              v_is_household_expense := true;
            end if;
          else
            v_posted_without_household := true;
          end if;
        end if;

        v_transaction_id := private.write_transaction(
          v_template.user_id, null, v_term.description, v_term.amount, 'expense', v_term.category_id,
          v_date, null, 1, v_term.savings_goal_id,
          jsonb_build_array(jsonb_build_object('payment_method', v_term.payment_method, 'amount', v_term.amount)),
          null, v_shares, v_is_household_expense
        );

        update public.recurring_occurrences
           set transaction_id = v_transaction_id, posted_without_household = v_posted_without_household
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

commit;
