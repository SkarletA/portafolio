-- ADR-017, schema: savings-funded (Goal withdrawal) recurring expenses.
-- savings_goal_id is a term property, versioned like amount and category -
-- the user may fund some months from savings and others from income without
-- rewriting history. No behaviour change: every existing row keeps it null.

begin;

alter table public.recurring_expense_terms
  add column savings_goal_id uuid references public.goals (id),
  add constraint recurring_expense_terms_savings_share_mutually_exclusive
    check (not (is_shared and savings_goal_id is not null));

commit;
