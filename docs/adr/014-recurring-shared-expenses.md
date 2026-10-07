# 014. Recurring expenses: shared split (Case A)

## Status

Accepted. Migrations applied and `database.types.ts` regenerated; the RPCs,
the posting job and the client (form, card, errors, i18n) are implemented on
one branch/PR, in commits, per the product owner's call (see Implementation).
Not independently re-verified against a live household dissolving mid-template
beyond manual testing of the create/edit/display paths - the SQL regression
this ADR's Implementation section describes is still to run.

Amends [ADR-012](./012-recurring-expenses.md): fulfils the "Shared expense with
a split (Case A, ADR-009)" row of its "Interaction with existing features"
table, which left this out of v1. Builds on [ADR-005](./005-money-arithmetic-in-the-client.md)
(the new `owner_share_amount` column follows Amendment 2), [ADR-007](./007-household-foundations.md)
(visibility without write access, unchanged) and [ADR-009](./009-shared-expense-split.md)
(a fixed owner amount, not a percentage; the partner's amount is always the
exact remainder).

Case B (the household tag without a split, ADR-010) is out of scope here,
deliberately, and is its own future ADR (see Alternatives considered).

## Context

ADR-012 shipped recurring expenses without support for a shared split, because
two things were unresolved: the posting job runs with no user session and
could not write `transaction_shares`, and a household that ends mid-template
would leave posting with no way to finish, as the ADR itself documented.

The first concern turned out to already be solved: `private.write_transaction`
(ADR-012, PR 2) already takes `p_shares` and `p_is_household_expense` and
already validates and persists them - it was written generic enough for both
cases from the start, even though no caller used them for Case A/B yet. The
only gap is that nothing builds a real `p_shares` value for a recurring
occurrence, and the client RPCs have no way to record that a template is
shared.

The second concern - a household ending mid-template - is real and needed a
decision. The closest existing precedent is a one-off shared transaction
whose household later dissolves: editing it fails loudly with
`household_required_for_shared_expense` (`private.write_transaction`'s
share-participant check). Applying the same "fail and leave it to the user"
rule to an unattended, hourly-rerun job would mean the same overdue date is
retried and fails forever, with no action available to the owner other than
re-forming the household - a worse outcome than ADR-012 itself flagged as
needing a decision, not an acceptable default.

A split is a property that must change over time without rewriting history
("50/50 until March, 60/40 after"), exactly like `amount` or `category_id`
already do in `recurring_expense_terms`.

## Decision

1. **The split is a term property, not a template property.**
   `recurring_expense_terms` gains:
   - `is_shared boolean not null default false`
   - `owner_share_amount numeric` (nullable; ADR-005 Amendment 2: unconstrained
     numeric with CHECKs, never `numeric(12,2)`)

   CHECKs: `owner_share_amount is not null = is_shared` (present if and only
   if shared), and when present, `owner_share_amount > 0 and
   owner_share_amount < amount and owner_share_amount = round(owner_share_amount, 2)
   and owner_share_amount < 10000000000`.

   No new table. Unlike `transaction_shares`, no row needs to persist a
   participant's identity ahead of time - the partner is resolved at posting
   time against the household that exists that day, exactly like Case B
   already resolves "an active household" at write time rather than storing
   it.

2. **Fixed amount, not a percentage**, matching ADR-009's own rejected
   alternative for the same reason: a percentage would reopen rounding at
   read time for every consumer instead of deciding it once. The owner types
   their own part; the partner's part is always the exact remainder.

3. **The remainder is computed in SQL, never in a client.** The posting job
   has no device and no user session, so there is no JavaScript arithmetic
   involved at all for this feature - `numeric` subtraction in Postgres is
   exact, so `amount - owner_share_amount` needs no cents helper and no
   rounding step.

4. **Amount and split are independent fields of the same term version.**
   Editing either one inserts a new term version with both fields present
   (unchanged or not), the same way `update_recurring_expense` already
   requires resending description, category and payment method on every edit
   even when only the amount changes. No diffing is introduced.

5. **`private.write_transaction` does not change.** It already accepts and
   persists `p_shares`. Only its callers change:
   - `private.post_due_recurring_occurrences`: for a term with `is_shared`,
     resolves the partner with the existing `private.household_member_ids(p_owner)`
     and builds `p_shares` as `[{owner, owner_share_amount}, {partner, amount -
     owner_share_amount}]`. When no partner is found (decision 6), it calls
     `write_transaction` with `p_shares = null` instead.
   - `create_recurring_expense`/`update_recurring_expense` gain
     `p_is_shared boolean default false, p_owner_share_amount numeric default null`.
     Creating or editing a shared term requires an active household,
     checked with the same `household_required_for_shared_expense` code
     `save_transaction`/`write_transaction` already raise for the one-off
     case - one error vocabulary for "sharing needs a partner," reused, not
     duplicated.
   - A new, small function, `private.assert_recurring_share(p_is_shared,
     p_owner_share_amount, p_amount)`, parallel to the existing
     `private.assert_recurring_terms`, raises `invalid_share_amount` for an
     out-of-range or wrongly-present value.

6. **No partner at posting time: post as owner-only, and say so - never fail
   and never silently stay unshared forever.** If a template's term is
   `is_shared` but the job finds no accepted household partner for that
   `scheduled_date`, it posts the full amount as a plain, unshared expense
   (`p_shares = null`) and sets a new column,
   `recurring_occurrences.posted_without_household boolean not null default
   false`, to `true` on that occurrence. The template is not paused, cancelled
   or otherwise mutated: the condition is re-evaluated independently at every
   future date, so a household re-formed before the next charge resumes the
   split with no manual action. This combines the two options ADR-012 named
   ("pause... or post as owner-only") into the one that never leaves a charge
   unrecorded, which is the one invariant ADR-012's Context treats as
   non-negotiable ("a recurring charge must be a real transaction dated on the
   day it happens").

7. **No confirmation step for the partner.** A shared template is the owner's
   unilateral decision, exactly like a one-off shared transaction already is
   (ADR-009: "Only the owner can create, edit or delete a shared expense - the
   partner's row ... is informational"). Introducing an accept/decline step
   here (the pattern `invite_household_member`/`accept_household_invite` uses)
   would make the same kind of spending decision behave differently depending
   on whether it was typed by hand once or scheduled to repeat, which is not
   a distinction the household-sharing model draws anywhere else. The
   trade-off is accepted: the partner learns about a new shared template
   passively, by seeing the transactions it posts, the same way they learn
   about a one-off shared expense today.

8. **Visibility is unchanged (ADR-007).** The template, its terms and its
   occurrences keep the existing household-wide `select` policy and no client
   write grant; the partner can see a shared template but never edit or
   cancel it, exactly as today.

## Implementation

Shipped commit by commit on one branch/PR (schema, then RPC and job, then
client), rather than ADR-012's staged multiple-PR rollout - the project
owner's call.

- Migration `supabase/migrations/20261008090000_recurring_shared_split_schema.sql`
  (schema only, no behaviour change): `recurring_expense_terms.is_shared`,
  `.owner_share_amount` and their CHECKs; `recurring_occurrences.posted_without_household`.
  Defaults leave every existing row unaffected.
- Migration `supabase/migrations/20261008100000_recurring_shared_split_rpc.sql`
  (RPCs and job): `create_recurring_expense`/`update_recurring_expense` gain
  the two new parameters (defaulted, so old clients are unaffected); new
  `private.assert_recurring_share`; `private.post_due_recurring_occurrences`
  builds `p_shares` or falls back per decision 6.
- `database.types.ts` regenerated after the migrations are applied (temporary
  file, diffed, per CLAUDE.md) - this needs the migrations applied to the live
  project first, by whoever has `supabase` CLI access to it.
- `domain/recurring.ts`'s `RecurringTerm` gains `isShared` and
  `ownerShareAmount`; `AddRecurringExpense.tsx` gets a "Share this expense"
  section mirroring `AddTransaction.tsx`'s own (own-share input,
  `roundMoneyInput` on blur, `subtractMoney`-computed preview of the partner's
  part - for display only, never sent; the database computes its own copy
  independently); `RecurringExpenseCard.tsx` shows the split and, when there
  is currently no accepted partner for an `is_shared` template, a preventive
  hint distinct from the existing `lastErrorHint`. `recurringExpensesErrors.ts`
  gains `invalid_share_amount` and reuses `household_required_for_shared_expense`.
  New `en`/`es` keys in the `recurring` namespace.
- SQL regression (manual, against a real project - this repository has no SQL
  test runner, ADR-005 Amendment 1): a shared template whose household
  dissolves posts its next due date unshared with
  `posted_without_household = true`, and resumes the split once a household
  exists again; editing a shared template's split keeps earlier charges'
  split and amount independent of the new term's.

## Consequences

- No new table, no new state machine, no persisted "paused" state: the
  no-partner fallback is a pure function of the day's household, re-evaluated
  on every run.
- `private.write_transaction` needed zero changes - the generic shape ADR-012
  gave it already covers this.
- A shared recurring template can silently become a sequence of partly-shared,
  partly-owner-only charges over its life, each one correctly reflecting the
  household state on its own date - never retroactively rewritten, matching
  how a term's price change already only ever applies forward.
- `recurring_occurrences.posted_without_household` is the only new piece of
  state; it exists purely so a future UI (or this one) can tell the owner
  which charges were affected, without re-deriving it from household history.
- Case B (ADR-010's household tag) gets none of this schema yet - adding its
  own `is_household_expense` term column is deferred to its own future ADR,
  even though the posting-job fallback it would need is nearly identical.

## Event rules

| Event | Result |
| --- | --- |
| Create a shared template | Requires an accepted household partner (`household_required_for_shared_expense`) and a valid `owner_share_amount` (`invalid_share_amount` otherwise). First term is `is_shared = true`. |
| Edit the split | New term version, `effective_from > today`, carrying every field (changed or not), same as any other edit. Earlier charges keep their term. |
| A scheduled date arrives, partner accepted | Posted with `transaction_shares` (owner's typed part, partner's exact remainder computed in SQL). |
| A scheduled date arrives, no accepted partner | Posted in full, unshared, `posted_without_household = true` on that occurrence. The template is untouched. |
| Partner never accepts the invite | Same as above, for every date, until accepted. |
| Household re-forms before the next date | The split resumes automatically; no action needed. |
| Cancel a shared template | Unchanged from ADR-012: dates up to `ended_on` still post (shared or not, per that date's household state); nothing after it does. |
| Delete a posted shared charge | Unchanged: the transaction (and its `transaction_shares`, cascaded) is removed; the occurrence is tombstoned. |
| Partner views the template | Read-only (ADR-007); write RPCs return `recurring_not_found`. |

## Alternatives considered (rejected)

- **A confirmation step for the partner**, mirroring
  `invite_household_member`/`accept_household_invite`. Rejected: no sharing
  decision anywhere else in the schema asks the partner's permission: ADR-009
  (one-off split) and ADR-010 (household tag) are both unilateral. Adding it
  here only for the recurring case would be an inconsistency the product has
  not asked for.
- **Pausing the template (an implicit `ended_on`) when the household ends.**
  Rejected: it needs a new mutation path outside the existing
  owner-initiated `cancel_recurring_expense`, and it still does not post the
  stuck charge - it only stops the retries. Posting as owner-only solves the
  actual problem (the charge must exist) with no new state.
- **Failing and relying on `last_error` with no fallback** (reusing exactly
  the existing retry mechanism with no change). Rejected: unlike every other
  cause of `last_error` in ADR-012, this one would never resolve itself by
  retrying, since nothing about "no partner" changes between hourly runs -
  the charge would silently never exist until the user noticed and re-formed
  a household, which both ADR-012 and this ADR's Context reject as an
  acceptable outcome.
- **Designing Case B (household tag) together, now.** Rejected for this ADR:
  the schema cost is small, but adding columns no RPC or UI would use yet is
  exactly the speculative architecture CLAUDE.md asks to avoid. The
  repository's own history backs this: Case A (ADR-009) shipped alone, and
  Case B (ADR-010) followed later, motivated by concrete product friction,
  not anticipated together.
- **A percentage column instead of a fixed amount.** Already rejected by
  ADR-009 for the one-off case, for the same reason: it would reopen rounding
  at read time for every consumer instead of deciding it once.
- **A `recurring_expense_term_shares` child table**, mirroring
  `transaction_shares`. Rejected: nothing needs a participant's identity
  stored ahead of time - the partner for a given date is always resolved
  from the household that exists that day, the same way Case B already
  resolves "an active household" without storing who the partner is.

## Open decisions

Resolved for this ADR (confirmed by the product owner):

1. No confirmation step for the partner.
2. No partner at posting time: post as owner-only and mark the occurrence,
   never pause or fail forever.
3. Case A and Case B stay separate; Case B is a future ADR.
4. A warning in `leave_household`/the leave-household UI about active shared
   templates is out of this ADR's minimum scope - decision 2 already
   guarantees no money goes unrecorded without it.
5. Column and function names (`is_shared`, `owner_share_amount`,
   `posted_without_household`, `assert_recurring_share`,
   `invalid_share_amount`) confirmed as proposed.
