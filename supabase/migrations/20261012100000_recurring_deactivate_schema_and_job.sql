-- ADR-019, PR 1: deactivate/reactivate replaces the irreversible Cancel.
-- Schema and job only - no RPC, no UI change yet. Two new columns:
-- deactivated_since (currently paused, since when) and active_from (the
-- floor below which the job never again considers a candidate date,
-- advanced on every reactivation, never backdated - the same rule
-- start_on already applies to a brand-new template). Neither reuses
-- ended_on (final, legacy, retired by this ADR) or planned_end_on
-- (ADR-016's separate, self-expiring stop).

begin;

alter table public.recurring_expenses
  add column deactivated_since date,
  add column active_from date,
  add constraint recurring_expenses_deactivated_since_after_start
    check (deactivated_since is null or deactivated_since >= start_on),
  add constraint recurring_expenses_active_from_after_start
    check (active_from is null or active_from >= start_on);

-- One-time safety flush, unscoped, before converting legacy cancellations
-- below - mirrors the flush-before-pause rule the deactivate RPC will use
-- (PR 2), applied once at cutover so no genuinely-overdue date is lost to
-- the conversion. Unlike that RPC's flush, this one is not wrapped to
-- swallow errors: a migration is expected to fail loudly if something is
-- wrong.
select private.post_due_recurring_occurrences((current_date - 1), null);

-- Legacy cancellations (ended_on), converted by comparing the actual
-- effective stop date the job already enforces via least(), not by a
-- blanket rule (ADR-019, decision 7): a template still committed to
-- posting through a future or today's date becomes an ordinary active
-- template with a planned end instead of being stopped early.
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
where ended_on is not null;

-- The job: skip a deactivated template entirely (no date math at all), and
-- never consider a date before active_from, alongside the existing
-- start_on floor (active_from is always >= start_on by the CHECK above, so
-- one coalesce replaces the plain start_on comparison with no change in
-- behaviour for a template that was never deactivated).
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
    select re.id, re.user_id, re.day_of_month, re.start_on, re.ended_on, re.planned_end_on,
           re.deactivated_since, re.active_from, re.last_error
      from public.recurring_expenses re
     where p_owner is null or re.user_id = p_owner
     order by re.id
       for update skip locked
  loop
    continue when v_template.deactivated_since is not null;

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
      continue when v_date < coalesce(v_template.active_from, v_template.start_on) or v_date > v_limit;

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
