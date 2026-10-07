# 015. Recurring expenses: household tag without a split (Case B)

## Status

Accepted

Amends [ADR-012](./012-recurring-expenses.md): fulfils the "Household tag
without a split (Case B, ADR-010)" row of its "Interaction with existing
features" table, left out of v1 and, in [ADR-014](./014-recurring-shared-expenses.md),
explicitly deferred as its own future ADR once a real need surfaced - which it
did, immediately: a user testing ADR-014's shared split asked for the case
where one person covers the full amount but it should still count toward the
household, exactly ADR-010's Case B.

Builds on ADR-010 (the tag, `is_household_expense`, mutually exclusive with a
split) and reuses ADR-014's posting-job mechanics (the term-versioned flag,
the no-partner fallback, `posted_without_household`) rather than building a
second copy of them.

## Context

`AddTransaction.tsx` already offers Case A and Case B side by side, as two
mutually exclusive checkboxes under one "household expense" section: split
the amount with a partner, or tag the full amount as the household's with no
split. ADR-014 only built the recurring equivalent of the first choice. A
user who tried to set their own share to the full amount - "cubro el 100%,
pero sigue siendo del hogar" - found there is no such option: `is_shared`
requires both amounts to be positive, by design (ADR-009's `transaction_shares`
CHECKs), so a 100%/0% split is not representable as a split at all. It is
Case B.

## Decision

1. **Same shape as the split: a term property.** `recurring_expense_terms`
   gains `is_household_expense boolean not null default false`, with
   `transactions_household_tag_mutually_exclusive`-style CHECK:
   `not (is_shared and is_household_expense)`, mirroring the `transactions`
   table's own constraint exactly.

2. **No amount to validate.** Unlike the split, there is no
   `owner_share_amount` counterpart: the whole term's `amount` is the
   household's, same as ADR-010 for a one-off transaction. No new
   `private.assert_*` function is needed; the mutual-exclusion check and the
   household requirement are enough.

3. **`create_recurring_expense`/`update_recurring_expense` gain
   `p_is_household_expense boolean default false`.** Mutually exclusive with
   `p_is_shared` (`invalid_share_plan`, the same code
   `private.write_transaction` already raises for the one-off case). Requires
   an active household, reusing `household_required_for_household_expense`
   (`private.write_transaction`'s own Case B check), not a new code.

4. **Posting, with the same no-partner fallback ADR-014 built for the split.**
   `private.post_due_recurring_occurrences` checks for an accepted partner
   before calling `private.write_transaction` (unchanged - it already accepts
   `p_is_household_expense`). A partner: posts tagged. No partner: posts as a
   plain personal expense instead, and sets the existing
   `recurring_occurrences.posted_without_household` - the same column ADR-014
   added, since both cases are the identical underlying event ("this term
   needed a household that wasn't there when it posted"), not two separate
   states.

5. **No confirmation step, for the same reason ADR-014 gave for the split**:
   this is the owner's unilateral decision, matching ADR-010's one-off case.

## Implementation

- Migration `supabase/migrations/20261008110000_recurring_household_tag_schema.sql`:
  the column and its CHECK. No behaviour change.
- Migration `supabase/migrations/20261008120000_recurring_household_tag_rpc.sql`:
  `create_recurring_expense`/`update_recurring_expense` gain
  `p_is_household_expense`; `private.post_due_recurring_occurrences` gains the
  Case B branch of the same no-partner check ADR-014 introduced for Case A.
- `database.types.ts` regenerated after the migrations are applied.
- `domain/recurring.ts`'s `RecurringTerm` gains `isHouseholdExpense`.
  `AddRecurringExpense.tsx`'s share section becomes a two-choice,
  mutually-exclusive fieldset (split, or household tag), mirroring
  `AddTransaction.tsx`'s own layout. `RecurringExpenseCard.tsx` shows a
  "counts toward household, not split" line for a tagged term.

## Consequences

- No change to Budgets or Analytics: they already read `is_household_expense`
  from `transactions` for every row regardless of how it was created
  (ADR-010), so a recurring charge tagged this way is counted correctly with
  zero changes there.
- `posted_without_household` now means "this charge needed an active
  household (shared or tagged) and didn't have one," covering both cases with
  one column instead of two near-identical ones.

## Event rules

| Event | Result |
| --- | --- |
| Create or edit a household-tagged template | Requires an accepted partner (`household_required_for_household_expense`); refused together with a split (`invalid_share_plan`). |
| A scheduled date arrives, partner accepted | Posted with `is_household_expense = true`, full amount, no split. |
| A scheduled date arrives, no accepted partner | Posted as a plain personal expense, `posted_without_household = true` on that occurrence. The template is untouched. |
| Household re-forms before the next date | The tag resumes automatically; no action needed. |

## Alternatives considered (rejected)

- **A second "posted without household" column** distinct from ADR-014's.
  Rejected: both cases are the same event from the posting job's point of
  view - a term that needed a household and didn't have one that day - and a
  future screen explaining "why" reads one column, not two.
- **Deciding this together with ADR-014.** That was the original plan
  (ADR-012's table groups A and B), revisited in ADR-014 itself: no concrete
  need had surfaced yet for B, so building its columns then would have been
  speculative. Splitting them, as ADR-009/010 already did for one-off
  transactions, kept each change reviewable on its own and let this one wait
  until a real request justified it - which happened within the same testing
  session as ADR-014's own rollout.
