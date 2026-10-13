-- Goal deletion, opening-balance deletion, and dated deposits.
-- See docs/adr/004-goal-transfers.md (Revision history, 2026-10-13) and
-- docs/adr/006-reimbursement-purchase-links.md (Revision history).
--
-- A Goal can now be deleted by its owner once nothing still depends on it: no
-- withdrawal/refund transfer and no recurring_expense_terms row (any status)
-- names it. A client may also delete its own opening_balance rows, the same
-- way a deposit already could, but never insert one: opening_balance is
-- written once, by create_goal, and never re-insertable by the client. A
-- deposit may now be dated any local calendar day up to today, not only
-- today.

begin;

-- ---------------------------------------------------------------------------
-- Deposits: dated by the user, never in the future. A one-day buffer above
-- current_date (the server is UTC) so a user already past midnight in a zone
-- east of UTC is not rejected for their own "today"; the client itself never
-- offers a date later than its own local today.
-- ---------------------------------------------------------------------------
drop policy "Users add deposits to their own goals" on public.goal_transfers;

create policy "Users add deposits to their own goals"
  on public.goal_transfers for insert to authenticated
  with check (
    auth.uid() = user_id
    and kind = 'deposit'
    and transaction_id is null
    and date <= current_date + 1
    and exists (select 1 from public.goals g where g.id = goal_id and g.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- A wrong opening balance can now be deleted, the same way a deposit already
-- could. It stays non-insertable by the client (only create_goal writes one,
-- once): letting clients insert it at any time would record "already saved"
-- money without it ever coming out of any month's balance.
-- ---------------------------------------------------------------------------
drop policy "Users delete their own deposits" on public.goal_transfers;

create policy "Users delete their own deposits and opening balances"
  on public.goal_transfers for delete to authenticated
  using (auth.uid() = user_id and kind in ('deposit', 'opening_balance'));

-- ---------------------------------------------------------------------------
-- Goal deletion: only through this function, like every other Goal write.
-- Blocked while the Goal still funds an expense (withdrawal) or has
-- received a refund, or is named by a recurring template in any status -
-- deleting it would otherwise violate ADR-004's "exactly one transfer per
-- savings-funded transaction" invariant, or leave a template pointing at a
-- Goal that no longer exists. Deleting a Goal with only deposits and/or an
-- opening balance retroactively changes every past month that counted those
-- deposits (no snapshots exist); the client confirms that before calling
-- this.
-- ---------------------------------------------------------------------------
create function public.delete_goal(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_linked_expenses text;
  v_linked_templates text;
begin
  if v_uid is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  -- Lock the Goal first, in the same order private.write_transaction and the
  -- recurring posting job already lock Goals in, so a concurrent withdrawal
  -- cannot slip in between this check and the delete.
  perform 1 from public.goals where id = p_id and user_id = v_uid for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'goal_not_found';
  end if;

  select string_agg(t.description, ', ')
    into v_linked_expenses
    from public.goal_transfers gt
    join public.transactions t on t.id = gt.transaction_id
   where gt.goal_id = p_id and gt.kind in ('withdrawal', 'refund');
  if v_linked_expenses is not null then
    raise exception using errcode = 'P0001', message = 'goal_has_linked_expenses', detail = v_linked_expenses;
  end if;

  select string_agg(distinct ret.description, ', ')
    into v_linked_templates
    from public.recurring_expense_terms ret
   where ret.savings_goal_id = p_id;
  if v_linked_templates is not null then
    raise exception using errcode = 'P0001', message = 'goal_has_linked_recurring_templates', detail = v_linked_templates;
  end if;

  -- Only deposit/opening_balance rows can remain: the checks above ruled out
  -- any withdrawal or refund. goal_transfers.goal_id is NO ACTION (ADR-004),
  -- so they must be deleted before the Goal.
  delete from public.goal_transfers where goal_id = p_id;
  delete from public.goals where id = p_id and user_id = v_uid;
end;
$$;

revoke execute on function public.delete_goal(uuid) from public, anon;
grant execute on function public.delete_goal(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Close the one gap ADR-004 left open: DELETE on goals was never revoked
-- when INSERT/UPDATE were. Deletion now goes only through delete_goal, like
-- every other Goal write; the policy that used to gate direct client
-- deletes is dropped along with the privilege.
-- ---------------------------------------------------------------------------
drop policy "Users delete their own goals" on public.goals;
revoke delete on public.goals from anon, authenticated;

commit;
