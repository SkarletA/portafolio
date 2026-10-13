# 018. Leave-household warning

## Status

Accepted. Last revised: 2026-10-12 (see Revision history).

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

A second, distinct gap surfaced once the individual ("Mine") view started
attributing each person's own share of a Case A one-off shared expense
(ADR-009's revision): leaving a household never touches `transactions` or
`transaction_shares` (ADR-007), but it does narrow who `household_member_ids()`
resolves to, so a member who did not record a given shared expense loses
RLS's read access to that row entirely - not just the combined view, their
own historical figures too, for good. Unlike the recurring case above,
there is no future charge and no fallback protecting this: the money was
already recorded once, correctly, and the only thing at risk is the ex
partner's own ability to ever read their share of it again.

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

4. **The same confirmation step also counts the partner's one-off shared
   expenses, as a number, not a list.** `getSharedExpenseCountFromPartner(partnerId)`
   counts the caller's current partner's `is_shared` transactions - every one
   of them names the caller as the other party by construction (ADR-009's
   "participants are fixed"), so no further filter is needed. This is a
   count, not names, unlike (3): a one-off expense has no `description` the
   templates list reuses for free, and the product ask here is "how many,"
   not "which ones." The dialog now opens whenever either check finds
   something - a template, a one-off count above zero, or both - and each
   piece only renders when it has something to say, so an empty one never
   shows a hollow section.

## Implementation

- `recurringExpensesService.ts`: new
  `getActiveHouseholdLinkedRecurringExpenses()`.
- `transactionsService.ts`: new `getSharedExpenseCountFromPartner(partnerId)`.
- `Settings.tsx`: the leave-household action gains a confirmation step
  (mirroring the existing cancel-confirmation pattern already used in
  `RecurringExpenseCard.tsx`) listing the templates from (2) and, separately,
  the one-off count from (4), before calling the unchanged `leaveHousehold()`.
  Opens when either has something to show; each section (the template list,
  the count line) renders only when it is non-empty.
- New `en`/`es` keys in the `household`/`recurring` namespaces, including
  `household:settings.leaveWarningSharedCount` (count-interpolated, `_other`
  plural variant for en/es).
- No migration, no RPC change, no `database.types.ts` regeneration needed -
  neither check needed one.

## Consequences

- The recurring-template warning is purely informative: no money-correctness
  invariant depends on it (ADR-014 decision 6/ADR-015 decision 4 already
  guarantee no charge goes unrecorded).
- The one-off count is informative about something real and irreversible:
  once the household is left, RLS stops letting the ex-partner read those
  rows at all (ADR-007), so their own share of each one permanently drops
  out of their own figures (ADR-009's revision) with no way to recover it
  short of re-forming the household - still never a money-correctness bug,
  since the row and its `transaction_shares` are never touched, only no
  longer reachable by the member who didn't record them.
- `getRecurringExpenses()`'s own-only scope is preserved everywhere else;
  `getActiveHouseholdLinkedRecurringExpenses()` and
  `getSharedExpenseCountFromPartner()` exist solely for this warning.

## Event rules

| Event | Result |
| --- | --- |
| Leave household, no active shared/tagged templates and no one-off shared expenses (own or partner's) | Leaves immediately, as today. |
| Leave household, with active shared/tagged templates | The dialog lists them by name. |
| Leave household, with one-off shared expenses recorded by the partner | The dialog also shows how many, as a count (not names) - shown even with no affected template. |
| Confirm | `leave_household()` runs unchanged; future recurring charges post per ADR-014/015's existing no-partner fallback; past one-off shared expenses are untouched, just no longer readable by the member who didn't record them. |
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
- **Listing the one-off shared expenses by name too, like the recurring
  templates.** Rejected (product owner's call, for the revision): a one-off
  expense has no stable short label the way a recurring template's
  `description` already doubles as one - a date-and-amount list would be a
  new kind of display built solely for this dialog. A count answers "how
  many" with no new display.
- **Extending `getHouseholdAttributedEntries`/`getOwnAttributedEntries`
  (ADR-009's revision) to answer this instead of a new, narrower function.**
  Rejected: both already do more work than a count needs (date-range
  filtering, installment expansion, per-category attribution); a plain
  `is_shared` count has no range and no category, and reusing either would
  mean passing them meaningless parameters just to get a `.length`.

## Open decisions

None open; confirmed by the product owner: list affected templates by name
only, no aggregate amount; the one-off shared-expense count added in the
2026-10-12 revision is a plain number, never a list of names or amounts.

## Revision history

- 2026-10-12: Added Decision point 4, extending the same confirmation step
  to also count the caller's current partner's one-off shared (Case A)
  expenses, surfaced by the ADR-009 revision that made the individual
  ("Mine") view attribute each person's own share instead of the full
  amount to whoever recorded it. That revision made a second gap visible:
  leaving a household never touches `transactions`/`transaction_shares`
  (ADR-007), but it does make a member who did not record a given shared
  expense permanently unable to read it again, silently dropping their own
  share out of their own figures with no warning. Added
  `getSharedExpenseCountFromPartner()` and wired its count into the same
  dialog this ADR already built for the recurring-template case, rather
  than a second dialog or a new ADR, since it is the same warning answering
  a second question. The dialog's title/intro (`leaveWarningTitle`) was
  generalized from "Active recurring expenses will be affected" to cover
  both; the recurring-specific explanatory paragraph (`leaveWarningText`)
  now renders only when a template is actually affected.
