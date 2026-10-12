-- ADR-019, PR 2: activate/deactivate/delete, replacing cancel_recurring_expense.
--
-- cancel_recurring_expense's own parameter list does not change - it is
-- removed outright, not replaced with more arguments - but CLAUDE.md's
-- "no overloads, ever" rule still applies: drop the old signature in the
-- same migration that retires it (the precedent already set in
-- 20261012090000_drop_legacy_recurring_expense_overloads.sql).

begin;

-- Idempotent: a double tap or two open tabs is a no-op, not an error.
-- Flushes dates strictly before today (the same cutoff post_my_recurring_expenses
-- already uses) before pausing, so a genuinely-overdue date is never lost to
-- the pause. The flush is wrapped so a failure in it - including a different
-- template of the same owner failing for its own reason - can never block or
-- revert this deactivation; post_due_recurring_occurrences already contains
-- that kind of failure per-date (ADR-012, decision 3), this is
-- defense-in-depth only.
create function public.deactivate_recurring_expense(p_id uuid, p_today date)
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

  select * into v_template
    from public.recurring_expenses
   where id = p_id and user_id = v_uid
     for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'recurring_not_found';
  end if;

  if v_template.deactivated_since is not null then
    return p_id;
  end if;

  begin
    perform private.post_due_recurring_occurrences(p_today - 1, v_uid);
  exception when others then
    null;
  end;

  update public.recurring_expenses
     set deactivated_since = p_today
   where id = p_id;

  return p_id;
end;
$function$;

-- Idempotent. Never backfills: active_from is always p_today + 1, the same
-- "nothing backfilled" rule create_recurring_expense already applies to
-- start_on, regardless of how long the template was paused.
create function public.activate_recurring_expense(p_id uuid, p_today date)
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

  select * into v_template
    from public.recurring_expenses
   where id = p_id and user_id = v_uid
     for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'recurring_not_found';
  end if;

  if v_template.deactivated_since is null then
    return p_id;
  end if;

  update public.recurring_expenses
     set active_from = p_today + 1, deactivated_since = null
   where id = p_id;

  return p_id;
end;
$function$;

-- Unconditional: active, deactivated or past its planned end, all delete the
-- same way. recurring_expense_terms and recurring_occurrences cascade with
-- the template; transactions already posted are untouched (ADR-019,
-- decision 9) - the FK from recurring_occurrences to transactions is
-- `on delete set null` in the other direction only.
create function public.delete_recurring_expense(p_id uuid)
returns void
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

  delete from public.recurring_expenses
   where id = p_id and user_id = v_uid;

  if not found then
    raise exception using errcode = 'P0001', message = 'recurring_not_found';
  end if;
end;
$function$;

drop function public.cancel_recurring_expense(uuid, date, date);

revoke all on function public.deactivate_recurring_expense(uuid, date) from public, anon;
revoke all on function public.activate_recurring_expense(uuid, date) from public, anon;
revoke all on function public.delete_recurring_expense(uuid) from public, anon;

grant execute on function public.deactivate_recurring_expense(uuid, date) to authenticated;
grant execute on function public.activate_recurring_expense(uuid, date) to authenticated;
grant execute on function public.delete_recurring_expense(uuid) to authenticated;

commit;
