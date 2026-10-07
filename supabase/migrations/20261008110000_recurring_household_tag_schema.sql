-- ADR-015, schema: the household tag without a split (Case B) for recurring
-- expenses. Same shape as ADR-014's split - a term property - but with no
-- amount of its own: the whole term's amount is the household's, same as
-- ADR-010 for a one-off transaction. No behaviour change: every existing row
-- keeps is_household_expense = false.

begin;

alter table public.recurring_expense_terms
  add column is_household_expense boolean not null default false,
  add constraint recurring_expense_terms_share_plan_mutually_exclusive
    check (not (is_shared and is_household_expense));

commit;
