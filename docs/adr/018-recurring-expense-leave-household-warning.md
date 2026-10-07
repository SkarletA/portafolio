# 018. Recurring expenses: leave-household warning

## Status

Proposed

Amends [ADR-014](./014-recurring-shared-expenses.md) (open decision 4) and
[ADR-015](./015-recurring-household-expense-tag.md), both of which left this
"out of this ADR's minimum scope" because the no-partner fallback already
protects every dollar from going unrecorded. This ADR builds the
informative warning both deferred, with no change to `leave_household` or
to any RPC.

## Context

`leave_household()` (the household migration) deletes the household and
every `household_members` row with no check at all. `Settings.tsx` calls it
directly from a button with no confirmation step today. A user with active
shared (`is_shared`) or tagged (`is_household_expense`) recurring templates -
their own, or their partner's - gets no warning that those templates will
start posting `posted_without_household = true` from the next charge on,
even though the money is never lost (ADR-014 decision 6/ADR-015 decision 4).

## Decision

1. **No RLS or RPC change.**
   `recurring_expenses`/`recurring_expense_terms`'s existing `select` policy
   (`user_id in (select household_member_ids())`) already lets the client
   read both the caller's own templates and their accepted partner's, in
   one query - visibility without write access, the same ADR-007 pattern
   every recurring table already uses.

2. **A new, narrow read, not an extension of the existing fetcher.**
   `getRecurringExpenses()` deliberately filters `.eq('user_id', ...)`
   (ADR-012 decision 10: "the v1 UI shows only the user's own templates").
   Extending it to include the partner would break that limit everywhere
   else it is used. A new function,
   `getActiveHouseholdLinkedRecurringExpenses()`, selects every `ended_on is
   null` template whose current term has `is_shared` or
   `is_household_expense`, with no owner filter, relying on RLS to scope
   the result to the caller's household.

3. **A confirmation step, where there is none today.** `Settings.tsx`'s
   leave button calls `leave_household()` with no dialog. This adds one:
   before calling it, the client runs (2) and, if the result is non-empty,
   lists the affected templates **by name only** (own and partner's),
   mirroring how `RecurringExpenseCard` already surfaces this per-template
   rather than as an aggregate figure - and requires an explicit confirm.
   If empty, leaving proceeds exactly as today.

## Implementation

- `recurringExpensesService.ts`: new
  `getActiveHouseholdLinkedRecurringExpenses()`.
- `Settings.tsx`: the leave-household action gains a confirmation step
  (mirroring the existing cancel-confirmation pattern already used in
  `RecurringExpenseCard.tsx`) listing the templates from (2) before calling
  the unchanged `leaveHousehold()`.
- New `en`/`es` keys in the `household`/`recurring` namespaces.
- No migration, no RPC change, no `database.types.ts` regeneration needed.

## Consequences

- Purely informative: no money-correctness invariant depends on this
  (ADR-014 decision 6/ADR-015 decision 4 already guarantee no charge goes
  unrecorded).
- `getRecurringExpenses()`'s own-only scope is preserved everywhere else;
  the new function exists solely for this warning.

## Event rules

| Event | Result |
| --- | --- |
| Leave household, no active shared/tagged templates (own or partner's) | Leaves immediately, as today. |
| Leave household, with active shared/tagged templates | A confirmation step lists them by name before calling `leave_household()`. |
| Confirm | `leave_household()` runs unchanged; future charges post per ADR-014/015's existing no-partner fallback. |
| Cancel the confirmation | Nothing happens; the household is not left. |

## Alternatives considered (rejected)

- **A database-side block or warning (e.g. a check in `leave_household`
  itself).** Rejected: ADR-014/015 already decided the no-partner fallback
  makes this purely informative, not a correctness gate; blocking in the
  database would contradict that and add a new failure mode to an RPC that
  today cannot fail for this reason.
- **Extending `getRecurringExpenses()` with an optional "include household"
  flag.** Rejected: every other caller relies on it being own-only; a flag
  used by exactly one caller is not a real generalization.
- **Naming the amount at risk, not just the templates.** Rejected (product
  owner's call): listing by name only is consistent with how
  `RecurringExpenseCard` already surfaces this per-template rather than as
  an aggregate figure.

## Open decisions

None open; confirmed by the product owner: list affected templates by name
only, no aggregate amount.
