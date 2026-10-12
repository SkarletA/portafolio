-- ADR-019, amendment (found running supabase/tests/recurring_expenses.sql
-- against the live project after PR 2): deactivating a brand-new template
-- before its first charge is a legitimate flow -
-- create_recurring_expense never backfills, so start_on is always
-- tomorrow, and a user may deactivate the same day they create it
-- (deactivated_since = today < start_on). The
-- recurring_expenses_deactivated_since_after_start CHECK wrongly rejected
-- that. It was never load-bearing: the job's whole-template skip
-- (`continue when deactivated_since is not null`, in
-- private.post_due_recurring_occurrences) never compares deactivated_since
-- to start_on at all.
--
-- active_from keeps its own CHECK (recurring_expenses_active_from_after_start):
-- activate_recurring_expense always sets it to p_today + 1, and p_today is
-- never before start_on in any real flow, so that one is both correct and
-- load-bearing (it is the floor the job's date loop actually compares against).

begin;

alter table public.recurring_expenses
  drop constraint recurring_expenses_deactivated_since_after_start;

commit;
