# 009. Shared expense split

## Status

Accepted

Amends [ADR-006](./006-reimbursement-purchase-links.md): a reimbursement can
no longer link to a purchase that is shared (`invalid_refund_link` now also
covers this case), and a purchase that already has reimbursements linked to
it can never become shared (`purchase_has_linked_refunds` now also covers
this case). Every other decision in ADR-006 is unchanged.

Builds on [ADR-007](./007-household-foundations.md): reuses
`household_member_ids()` to find the caller's household partner. Does not
change visibility - a shared expense was already fully readable by both
household members before this ADR, exactly like a personal one.

## Context

The product asks for one specific thing: "compartido" is a property of a
single transaction, decided at the moment it is recorded, never a fixed rule
by category ("Renta siempre 50/50"). Two people who already see each other's
full transaction history (ADR-007) also want some expenses to record *who put
in how much*, as a distinct thing from *who can see it*.

Two designs were compared before this one, in the original architecture
proposal:

- **(a) Two independent transactions**, one per person. Zero schema change,
  but no atomicity (date/category/description can silently diverge between
  the two halves of what is conceptually one expense) and no way to see later
  "this was a shared expense, my part was X of Y" - it is indistinguishable
  from two coincidentally-similar personal expenses.
- **(b) One transaction with a split**, reusing the shape `transaction_payments`
  already solved for "a total divided into parts that must sum exactly" -
  same invariant, a different axis (people instead of payment methods).

(b) is the one this ADR implements: it is the only option that matches "a
single transaction decides its own split," and it reuses an already-proven
pattern instead of inventing one.

## Decision

- **`transactions.is_shared boolean`**, default `false`. Never sent directly
  by the client - `save_transaction` derives it from whether `p_shares` is a
  non-empty array, the same way `funding_source` is already derived rather
  than trusted from the caller.
- **`transaction_shares`**: `id`, `transaction_id` (`references transactions`,
  `on delete cascade`, `NO ACTION` deferred to statement end like
  `refunds_transaction_id`), `user_id`, `amount numeric(12,2) check (amount >
  0)`, `unique (transaction_id, user_id)`. Exactly two rows whenever
  `is_shared` is true - the owner and their household partner - written only
  by `save_transaction`.
- **RLS matches ADR-007's shape exactly**: `select` widened to
  `household_member_ids()`, no client `insert`/`update`/`delete` grant at
  all (stricter than `transaction_payments`, which keeps unreachable
  self-only write policies for symmetry - `transaction_shares` has no
  precedent to be symmetric with, so it starts write-only-via-RPC from day
  one).
- **v1 restrictions, enforced together in a single check constraint**
  (`transactions_shared_expense_only`): a shared expense must be
  `type = 'expense'`, `funding_source = 'income'`, `installment_months = 1`,
  and `refunds_transaction_id is null`. The mirror rule - a reimbursement
  cannot target a *shared* purchase, and a purchase with linked
  reimbursements cannot *become* shared - is a cross-row condition a `check`
  cannot express, so it is enforced procedurally in `save_transaction` (see
  Implementation). None of this is a gap to close later by itself: financing
  a split in monthly installments means running the cents-exact installment
  allocation (`domain/installments.ts`) once per month *and* once per person
  inside each month, and a savings-funded split means deciding which Goal (or
  whose) it draws from - both are real feature decisions the product has not
  asked for yet, not omissions.
- **The split is accounting, not a visibility rule.** It does not change
  anything about `getGrossSpendByCategory` (ADR-001/002/003): the full
  `amount` still counts against the category and the budget of whoever
  recorded the transaction (`transactions.user_id`), exactly as an unshared
  expense does. `transaction_shares` says who put in how much; it does not
  move the expense onto someone else's budget. Reopening that is its own
  future decision, not a side effect of this one.
- **Participants are fixed: the caller and their current household
  partner.** `household_member_ids()` already resolves to exactly `{caller}`
  ∪ `{accepted partner}` (ADR-007); subtracting the caller's own id leaves at
  most one candidate. No household, or only a pending invitation either way,
  yields none, and the save is rejected with
  `household_required_for_shared_expense` rather than silently accepting an
  invalid split.
- **One writer, same as every money-moving RPC in this schema.**
  `save_transaction` gains `p_shares jsonb default null`; the old 11-argument
  signature (ADR-006) is dropped, and the default lets this migration apply
  before the client is deployed - an old client that edits a shared
  transaction would simply unshare it, the same graceful-degradation the
  ADR-006 rollout already relied on for its own new argument.

## Implementation

- Migration `supabase/migrations/20260930150000_shared_expense_split.sql`:
  the column, the constraint, `transaction_shares` with its RLS, and the
  rewritten `save_transaction`. No data pre-flight needed - both additions
  are inert for every existing row (`is_shared` defaults `false`,
  `transaction_shares` starts empty).
- New error codes (all `P0001`): `invalid_share_plan` (type/funding/
  installments wrong for a shared expense), `household_required_for_shared_expense`,
  `invalid_share_recipient` (not exactly two distinct participants, or one
  of them isn't the caller and their household partner),
  `shares_do_not_match_amount`. `invalid_refund_link` and
  `purchase_has_linked_refunds` (ADR-006) each gain the one extra case
  described above.
- `domain/transactionShare.ts`: `TransactionShare`, mirroring
  `domain/transactionPayment.ts`. `domain/transaction.ts`: `Transaction`
  gains `is_shared: boolean` and `shares: TransactionShare[]`.
- `services/transactionsService.ts`: `TRANSACTION_SELECT` embeds
  `shares:transaction_shares(id, transaction_id, user_id, amount)`;
  `NewTransactionInput` gains `shares?: TransactionShareInput[]`;
  `saveTransaction` sends `p_shares` (`null` when omitted or empty, matching
  how `refunds_transaction_id` already normalizes to `null`).
  `services/moneyMovementErrors.ts`: the four new codes.
- No UI in this PR - same staged rollout ADR-006 used (data model and RPC
  first, nothing visible changes because no screen sends `p_shares` yet). A
  following PR adds the "Share this expense" toggle in Add Transaction, the
  split input, and `TransactionItem` showing who put in how much.

## Consequences

- **A shared expense still counts in full against its owner's budget.**
  Nothing about ADR-001/002/003's figures changes; `transaction_shares` is
  read by nothing yet outside this RPC.
- **Sharing requires an active household**, checked at save time, not only
  at the UI layer - `household_required_for_shared_expense` fires even if a
  stale client tries to resend a share after the household was dissolved.
- **A shared expense cannot be financed in installments or paid from
  savings, and cannot be or receive a reimbursement**, until a future ADR
  revisits each of those combinations on its own.
- **Only the owner can create, edit or delete a shared expense** - the
  partner's row in `transaction_shares` is informational, matching ADR-007's
  "visibility, not ownership": forming a household or appearing in a share
  never grants write access to anyone else's transaction.
- **Alternatives considered (rejected):**
  - *(a) Two independent transactions*: see Context - no atomicity, no
    single place that says "this was shared."
  - *A `transaction_shares.percentage` column instead of `amount`*: percentage
    vs. fixed amount is a client-side input concern (the amount shown and
    sent is always the converted, rounded figure - ADR-005), not a server
    one; storing a percentage would reopen rounding at read time for every
    consumer instead of once at save time.
  - *Allowing more than two participants*: households are exactly two people
    (ADR-007); a third participant has no household row to justify it.
  - *A cached `is_shared` derived at query time from `exists (select 1 from
    transaction_shares ...)` instead of a stored column*: every consumer
    (RLS policies aside) would need the join merely to know whether a row is
    shared, and the v1 check constraint could not be expressed without it.
