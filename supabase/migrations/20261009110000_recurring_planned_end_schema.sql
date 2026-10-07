-- ADR-016, schema: a planned end (fixed count or fixed date) for recurring
-- expenses. A new column, deliberately not a reuse of ended_on: a planned
-- end is extendable or removable later, where a cancellation
-- (ended_on, set only by cancel_recurring_expense) is final by design. No
-- behaviour change: every existing row keeps both new columns null.

begin;

alter table public.recurring_expenses
  add column planned_end_on date,
  add column planned_charges integer,
  add constraint recurring_expenses_planned_end_after_start
    check (planned_end_on is null or planned_end_on >= start_on),
  add constraint recurring_expenses_planned_charges_range
    check (planned_charges is null or planned_charges between 1 and 600);

commit;
