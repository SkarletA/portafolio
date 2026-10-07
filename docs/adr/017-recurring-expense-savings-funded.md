# 017. Recurring expenses: covered by savings (Goal withdrawal)

## Status

Proposed

Amends [ADR-012](./012-recurring-expenses.md)'s "Covered by savings (Goal
withdrawal)" row of "Interaction with existing features", which called this
"out of v1. Designed later", reasoning that "if the Goal lacks funds the
charge is not posted... the occurrence is marked failed with its error
visible, and the funding source is never changed silently." This ADR shows
that exact behaviour already exists generically in the posting job built by
ADR-012 itself, for a different reason (the `last_error`/retry mechanism),
and needs no new state machine - only the missing schema field and its
plumbing through `create_recurring_expense`/`update_recurring_expense` and
the job's call to `private.write_transaction`.

Builds on [ADR-004](./004-goal-transfers.md) (a Goal's balance is the single
source of truth, checked and locked in the database, never in JavaScript).

## Context

`private.write_transaction` (ADR-012, PR 2) already accepts
`p_savings_goal_id` and already does everything a recurring charge would
need: locks the Goal, compares `current_amount` against the amount in exact
`numeric`, and raises `insufficient_goal_funds` with the available amount as
`detail` if there is not enough. The posting job's `exception when others`
block already rolls back the failed occurrence, records `last_error =
sqlerrm`, and retries on the next hourly run - for *any* failure, not only
this one.

ADR-012's objection ("cannot publish without balance, cannot skip the
charge, cannot change the funding source silently") describes three things
the retry mechanism already never does: a failed run rolls back (no publish
without balance), the next run retries the same date (no skip), and there
is no fallback branch that substitutes a different funding source (unlike
ADR-014's no-partner fallback, there is no safe alternative here at all -
the money genuinely is not there, so waiting until it is, is the only
option left by elimination). ADR-012 was right that the schema had no field
for which Goal to use; it was not right to treat the *posting mechanism* as
unable to handle the failure - it already does, for a reason unrelated to
savings.

## Decision

1. **`savings_goal_id` is a term property, not a template property**, with
   the same reasoning ADR-014 gave for `is_shared`: the user may fund a
   charge from savings for some months and from income for others, without
   rewriting history. `recurring_expense_terms` gains `savings_goal_id uuid
   references public.goals (id)` (nullable). Unlike `owner_share_amount`, no
   separate presence boolean is needed: `savings_goal_id is not null` is
   itself the flag, the same way `category_id` needs none.

2. **Mutually exclusive with a split, not with the household tag** -
   matching `private.write_transaction`'s own rule exactly (`v_is_shared and
   p_savings_goal_id is not null` is already refused there as
   `invalid_share_plan`; `p_is_household_expense` with `p_savings_goal_id`
   is not). New CHECK on `recurring_expense_terms`:
   `constraint recurring_expense_terms_savings_share_mutually_exclusive
   check (not (is_shared and savings_goal_id is not null))`.

3. **No new `private.assert_*` function**, for the same reason ADR-015
   needed none for `is_household_expense`: the only checks are "does this
   Goal belong to the caller" (`goal_not_found`, the same code
   `write_transaction` already raises) and the exclusion above, both small
   enough to inline in `create_recurring_expense`/`update_recurring_expense`,
   matching how `household_required_for_household_expense` is already
   inlined there.

4. **`create_recurring_expense`/`update_recurring_expense` gain
   `p_savings_goal_id uuid default null`**, defaulted so existing callers
   are unaffected.

5. **The job changes one argument, nothing else.**
   `private.write_transaction` does not change - it already accepts and
   validates `p_savings_goal_id`. Its only caller that matters here,
   `private.post_due_recurring_occurrences`, passes `v_term.savings_goal_id`
   instead of the literal `null` it passes today.

6. **Insufficient funds retries exactly like every other posting failure,
   with no fallback branch.** Unlike ADR-014's no-partner case (where
   posting unshared is a safe alternative that still records the money),
   there is no safe alternative when a Goal lacks funds: the money the
   charge represents does not exist yet. Posting from income instead would
   be the silent funding-source change ADR-012 forbids; skipping would
   violate "a charge must always exist" (ADR-012's Context). Retrying until
   the owner deposits more, which the existing generic mechanism already
   does, is the only option left, and needs no new column, no new status
   and no new RPC.

7. **The card's insufficient-funds hint names the Goal and the missing
   amount.** `last_error` already holds the literal text
   `insufficient_goal_funds` when this is the failure; the client, already
   holding the term's Goal (via `useGoals`) and the amount due, shows "Not
   enough in {goal} - needs {amount} more" instead of the generic
   `lastErrorHint`, so the owner knows what to deposit without guessing.

## Implementation

- Migration (schema): `recurring_expense_terms.savings_goal_id`, the new
  CHECK. No behaviour change; every existing row keeps it null.
- Migration (RPC/job): `create_recurring_expense`/`update_recurring_expense`
  gain the trailing defaulted parameter and its two inline checks
  (`goal_not_found`, exclusion with `is_shared`);
  `private.post_due_recurring_occurrences`'s call to
  `private.write_transaction` passes `v_term.savings_goal_id` in place of
  `null`.
- `database.types.ts` regenerated after the migrations are applied.
- `domain/recurring.ts`'s `RecurringTerm` gains `savingsGoalId: string |
  null`.
- `recurringExpensesService.ts`: `RecurringExpenseInput`/
  `RecurringExpenseTermRow` gain `savings_goal_id`;
  `createRecurringExpense`/`updateRecurringExpense` pass it through.
- `AddRecurringExpense.tsx`: a Goal `Select` under a "Covered by savings"
  section, reusing `useGoals`, mirroring `AddTransaction.tsx`'s own
  section; mutually exclusive with "Share with partner" only (not with
  "Household expense"), matching decision 2.
- `RecurringExpenseCard.tsx`: a "Funded from {goal}" line when the current
  term has `savingsGoalId`; when `last_error === 'insufficient_goal_funds'`,
  the specific hint from decision 7 instead of the generic `lastErrorHint`.
- New `en`/`es` keys in the `recurring` namespace.

## Consequences

- `private.write_transaction` needs zero changes, exactly like ADR-014
  found for the shared split - the generic shape ADR-012 gave it already
  covers this.
- No new state machine, no new column recording "failed for lack of funds"
  specifically: `last_error`'s existing text already distinguishes it.
- A savings-funded recurring charge can retry indefinitely if the Goal is
  never topped up; this is the intended behaviour (the alternative is
  recording money that was never saved), not a bug to fix later.

## Event rules

| Event | Result |
| --- | --- |
| Create or edit a term with `savings_goal_id` | Requires the Goal to belong to the caller (`goal_not_found` otherwise); refused together with a split (`invalid_share_plan`). Allowed together with the household tag. |
| A scheduled date arrives, enough balance | Posted; the Goal's balance drops by the full amount on the scheduled date, same rule as a one-off savings-funded expense (ADR-004). |
| A scheduled date arrives, insufficient balance | `write_transaction` raises `insufficient_goal_funds`; the occurrence's writes roll back, `last_error` is set, the next hourly run retries. Not posted, not skipped, not funded from income instead. |
| The owner deposits enough before the next run | The same date posts on the next run, with no manual action beyond the deposit. |

## Alternatives considered (rejected)

- **A new status/column for "blocked on funds".** Rejected: `last_error`'s
  existing text already carries this distinction; a dedicated column would
  duplicate it.
- **Posting from income when the Goal lacks funds.** Rejected: this is
  exactly the "silently change the funding source" ADR-012 forbids.
- **Skipping the date and moving on, like a tombstoned deletion.** Rejected:
  violates "a charge must always exist" (ADR-012's Context); unlike a
  user-initiated delete, nothing here was the owner's decision.
- **A new `private.assert_recurring_savings` function.** Rejected for the
  same reason ADR-015 gave for `is_household_expense`: the checks are small
  enough to inline.

## Open decisions

None open; confirmed by the product owner: the card's insufficient-funds
hint names the Goal and the missing amount (decision 7).
