-- Goal deletion, opening-balance deletion, and dated deposits.
-- See docs/adr/004-goal-transfers.md (Revision history, 2026-10-13) and
-- docs/adr/006-reimbursement-purchase-links.md (Revision history).
--
-- Like household_rls.sql, this switches the *session role* to authenticated
-- with "set local role" for the client-facing checks: delete_goal and the
-- goal_transfers RLS are exactly what a direct client call would hit, and
-- running them as the superuser role that owns these tables would bypass
-- both the DELETE privilege revocation on goals and the deposit-date RLS
-- check entirely. auth.uid() is simulated via the request.jwt.claim(s) GUCs,
-- transaction-local state unaffected by SET LOCAL ROLE.
--
-- Run it in the Supabase SQL editor (or psql) as a privileged role, AFTER
-- the goal_deletion_and_dated_deposits migration. It ends in ROLLBACK, so it
-- leaves no data behind; any failed check raises an exception naming what
-- went wrong. Needs at least one row in public.categories.

begin;

do $$
declare
  v_user uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_category uuid;
  v_today date := (now() at time zone 'utc')::date;
  v_goal uuid;
  v_deposit uuid;
  v_template uuid;
  v_purchase uuid;
  v_detail text;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then
    raise exception 'goal_deletion_and_dated_deposits: public.categories is empty';
  end if;

  insert into auth.users (id) values (v_user), (v_other);

  execute 'set local role authenticated';

  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  -- ---------------------------------------------------------------------
  -- 1. Dated deposits: any past day, never the future.
  -- ---------------------------------------------------------------------
  v_goal := public.create_goal('Vacation', 5000, null, 0, v_today);

  insert into public.goal_transfers (goal_id, kind, amount, date)
  values (v_goal, 'deposit', 100, v_today - 400)
  returning id into v_deposit;

  if (select current_amount from public.goals where id = v_goal) <> 100 then
    raise exception 'goal_deletion_and_dated_deposits: a deposit dated well before the goal existed did not update the balance';
  end if;

  begin
    insert into public.goal_transfers (goal_id, kind, amount, date) values (v_goal, 'deposit', 50, v_today + 2);
    raise exception 'goal_deletion_and_dated_deposits: a deposit dated in the future was accepted';
  exception when others then
    if sqlstate <> '42501' then
      raise exception 'goal_deletion_and_dated_deposits: expected a row-security rejection for a future deposit, got % (%)',
        sqlerrm, sqlstate;
    end if;
  end;

  -- A client can delete a deposit directly, same as before this revision.
  delete from public.goal_transfers where id = v_deposit;
  if (select current_amount from public.goals where id = v_goal) <> 0 then
    raise exception 'goal_deletion_and_dated_deposits: deleting the deposit did not return its amount';
  end if;

  -- ---------------------------------------------------------------------
  -- 2. A client cannot DELETE goals directly any more - only delete_goal.
  -- ---------------------------------------------------------------------
  begin
    delete from public.goals where id = v_goal;
    raise exception 'goal_deletion_and_dated_deposits: a client deleted a goal directly';
  exception when others then
    if sqlstate <> '42501' then
      raise exception 'goal_deletion_and_dated_deposits: expected permission denied deleting goals directly, got % (%)',
        sqlerrm, sqlstate;
    end if;
  end;

  -- ---------------------------------------------------------------------
  -- 3. delete_goal: the happy path - only a deposit, nothing blocks it.
  -- ---------------------------------------------------------------------
  insert into public.goal_transfers (goal_id, kind, amount, date) values (v_goal, 'deposit', 300, v_today);
  perform public.delete_goal(v_goal);

  if exists (select 1 from public.goals where id = v_goal) then
    raise exception 'goal_deletion_and_dated_deposits: delete_goal left the Goal behind';
  end if;
  if exists (select 1 from public.goal_transfers where goal_id = v_goal) then
    raise exception 'goal_deletion_and_dated_deposits: delete_goal left its transfers behind';
  end if;

  -- ---------------------------------------------------------------------
  -- 4. delete_goal: blocked by a withdrawal (a savings-funded expense),
  -- naming it in the error detail; deleting the expense unblocks it.
  -- ---------------------------------------------------------------------
  v_goal := public.create_goal('Laptop fund', 2000, null, 500, v_today);

  v_purchase := public.save_transaction(null, 'New laptop', 200, 'expense', v_category, v_today, null, 1, v_goal,
    '[{"payment_method":"Card","amount":200}]'::jsonb);

  begin
    perform public.delete_goal(v_goal);
    raise exception 'goal_deletion_and_dated_deposits: delete_goal succeeded with a withdrawal still linked';
  exception when others then
    if sqlerrm <> 'goal_has_linked_expenses' then
      raise exception 'goal_deletion_and_dated_deposits: expected goal_has_linked_expenses, got %', sqlerrm;
    end if;
    get stacked diagnostics v_detail = pg_exception_detail;
    if v_detail <> 'New laptop' then
      raise exception 'goal_deletion_and_dated_deposits: expected the error to name "New laptop", got %', v_detail;
    end if;
  end;

  delete from public.transactions where id = v_purchase;
  perform public.delete_goal(v_goal);

  if exists (select 1 from public.goals where id = v_goal) then
    raise exception 'goal_deletion_and_dated_deposits: delete_goal did not delete the Goal once the withdrawal was gone';
  end if;

  -- ---------------------------------------------------------------------
  -- 5. delete_goal: blocked by a recurring template naming the Goal, in any
  -- status (active or deactivated) - deleting the template unblocks it.
  -- ---------------------------------------------------------------------
  v_goal := public.create_goal('Car fund', 6000, null, 1000, v_today);

  v_template := public.create_recurring_expense(
    'Car payment', 300, v_category, 'Card', 1, v_today, false, null, false, v_goal
  );

  begin
    perform public.delete_goal(v_goal);
    raise exception 'goal_deletion_and_dated_deposits: delete_goal succeeded with an active template still linked';
  exception when others then
    if sqlerrm <> 'goal_has_linked_recurring_templates' then
      raise exception 'goal_deletion_and_dated_deposits: expected goal_has_linked_recurring_templates (active), got %', sqlerrm;
    end if;
    get stacked diagnostics v_detail = pg_exception_detail;
    if v_detail <> 'Car payment' then
      raise exception 'goal_deletion_and_dated_deposits: expected the error to name "Car payment", got %', v_detail;
    end if;
  end;

  perform public.deactivate_recurring_expense(v_template, v_today);

  begin
    perform public.delete_goal(v_goal);
    raise exception 'goal_deletion_and_dated_deposits: delete_goal succeeded with a deactivated template still linked';
  exception when others then
    if sqlerrm <> 'goal_has_linked_recurring_templates' then
      raise exception 'goal_deletion_and_dated_deposits: expected goal_has_linked_recurring_templates (deactivated), got %', sqlerrm;
    end if;
  end;

  perform public.delete_recurring_expense(v_template);
  perform public.delete_goal(v_goal);

  if exists (select 1 from public.goals where id = v_goal) then
    raise exception 'goal_deletion_and_dated_deposits: delete_goal did not delete the Goal once the template was gone';
  end if;

  -- ---------------------------------------------------------------------
  -- 6. Deleting an opening balance whose money was already used fails with
  -- goal_balance_negative, exactly like deleting a used deposit.
  -- ---------------------------------------------------------------------
  v_goal := public.create_goal('Emergency fund', 1000, null, 100, v_today);

  perform public.save_transaction(null, 'Car repair', 100, 'expense', v_category, v_today, null, 1, v_goal,
    '[{"payment_method":"Cash","amount":100}]'::jsonb);

  -- The non-negative check is a deferred constraint trigger (ADR-004): it
  -- only fires at commit, or when forced, which is why "set constraints all
  -- immediate" runs inside this same exception-guarded block - the implicit
  -- savepoint around a plpgsql EXCEPTION block undoes both the delete and
  -- the deferral-mode change together when it catches the violation.
  begin
    delete from public.goal_transfers where goal_id = v_goal and kind = 'opening_balance';
    set constraints all immediate;
    raise exception 'goal_deletion_and_dated_deposits: an already-used opening balance was deleted';
  exception when others then
    if sqlerrm <> 'goal_balance_negative' then
      raise exception 'goal_deletion_and_dated_deposits: expected goal_balance_negative, got %', sqlerrm;
    end if;
  end;

  -- ---------------------------------------------------------------------
  -- 7. Another user's Goal is invisible to delete_goal - goal_not_found,
  -- indistinguishable from a Goal that does not exist.
  -- ---------------------------------------------------------------------
  v_goal := public.create_goal('Solo goal', 100, null, 0, v_today);

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_other)::text, true);

  begin
    perform public.delete_goal(v_goal);
    raise exception 'goal_deletion_and_dated_deposits: another user deleted this Goal';
  exception when others then
    if sqlerrm <> 'goal_not_found' then
      raise exception 'goal_deletion_and_dated_deposits: expected goal_not_found, got %', sqlerrm;
    end if;
  end;

  execute 'reset role';

  -- ---------------------------------------------------------------------
  -- 8. Account deletion still cascades cleanly through a Goal that a
  -- recurring template still names - the NO ACTION foreign key on
  -- recurring_expense_terms.savings_goal_id relies on both rows being
  -- removed by auth.users' own cascades within the same statement.
  -- ---------------------------------------------------------------------
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  perform public.create_recurring_expense(
    'Car payment 2', 300, v_category, 'Card', 1, v_today, false, null, false, v_goal
  );

  delete from auth.users where id in (v_user, v_other);
  set constraints all immediate;

  if exists (
    select 1 from public.goals where user_id in (v_user, v_other)
    union all
    select 1 from public.goal_transfers where user_id in (v_user, v_other)
    union all
    select 1 from public.recurring_expenses where user_id in (v_user, v_other)
    union all
    select 1 from public.recurring_expense_terms where user_id in (v_user, v_other)
  ) then
    raise exception 'goal_deletion_and_dated_deposits: rows left after deleting the accounts';
  end if;

  raise notice 'goal_deletion_and_dated_deposits: all checks passed';
end;
$$;

rollback;
