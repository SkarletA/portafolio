# 001. Net category spend calculation (reimbursements + subcategory rollup)

## Status

Partially superseded by
[ADR-002](./002-gross-spend-and-effective-limit.md): "spent" is no longer net of
reimbursements and no longer floored at 0 - a budget's spend is now gross
(expenses only), and reimbursements widen its effective limit instead. The
rollup-scope mechanism decided here (`getCategoryIdsForRollup`: a parent's
scope is itself plus its direct children combined into one number) and the
reimbursement-must-have-a-category invariant are unaffected and remain
accurate.

## Context

Finora's schema was extended with two changes that affect how "how much has been
spent in a category this month" is calculated for Budgets and Analytics:

1. `transactions.type` gained a third value, `reimbursement`, alongside `expense`
   and `income`. A reimbursement always has a `category_id` (enforced by a
   database constraint) and represents money coming back for a prior expense in
   that category — it should reduce that category's spend, but it must never be
   treated as `income`.
2. `categories` gained a single level of subcategories via `parent_id`. A budget
   can be created on a parent category (e.g. "Food") or directly on a specific
   subcategory (e.g. "Carne").

This requires a precise, testable rule for what "spent" means per category.

## Decision

- **Net spend per category** = `sum(expense amounts) - sum(reimbursement amounts)`
  for that category's *rollup scope*.
- **Rollup scope**: if a category has children, its scope is itself plus all of
  its children combined into one number. If it has no children (including a
  subcategory itself, since subcategories are never nested further), its scope
  is just itself. A budget created directly on a subcategory therefore only
  ever reflects that subcategory — it does not roll up to its parent or sideways
  to sibling subcategories.
- **Clamping happens once, after summing the whole rollup scope**, never per
  transaction or per child before the sum. This matters: if one subcategory has
  more reimbursements than expenses and a sibling subcategory has net positive
  expenses, the parent's total nets them against each other before the floor is
  applied at 0. Clamping each child individually first, then adding, would
  produce a different (higher) number and hide the offsetting reimbursement.
- `income` transactions never participate in this calculation, in either
  direction — they are tracked separately (Analytics' `totalIncome`).
- The same net-spend function is used for both Budgets (`spent` per budgeted
  category) and Analytics (`totalSpent` globally, and per top-level category in
  "Spending by category"), so the two screens can never disagree about what a
  category's spend means.

## Implementation

The category-level rule is implemented once, as a pure function
(`getNetSpendByCategory` in `src/apps/finora/domain/category.ts`), independent of
Supabase, so it is directly unit-testable with plain arrays. Both
`transactionsService.getExpensesByCategoryForCurrentMonth()` and
`analyticsService.getMonthlyStats()`/`getSpendingByCategory()` call into it
after fetching the month's raw `{ category_id, type, amount }` rows, rather than
each re-deriving the same math independently.

`analyticsService.getDailySpending()` (the "Spending over time" trend line)
applies the same expenses-minus-reimbursements, clamp-once principle, just
bucketed by date instead of by category - a day's reimbursements offset that
same day's expenses, floored at 0. It was initially left out of this net
treatment and only summed gross expenses; that produced a "Spending over
time" total that didn't match "Total spent" / "Spending by category" on any
day with a reimbursement, which is confusing on one page, so it was corrected
to match.

## Consequences

- Budgets and Analytics are guaranteed to compute spend identically, since they
  share one function instead of two parallel implementations.
- Analytics' "Spending by category" only lists top-level categories (their
  rolled-up total already includes subcategory spend) — listing subcategories
  as additional separate rows would double-count spend that is already folded
  into the parent's total, and would make the displayed percentages sum to more
  than 100%.
- A category's own reimbursements can fully offset that category's expenses
  down to 0, but never go negative and reduce a *different* category's spend.
