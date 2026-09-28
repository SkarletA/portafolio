# 006. Linking a reimbursement to the purchase it refunds

## Status

Accepted

Amends [ADR-002](./002-gross-spend-and-effective-limit.md): a reimbursement
linked to a savings-funded purchase no longer widens `effectiveLimit` or nets
the savings rate (the `effectiveLimit` and "Savings rate keeps netting"
decisions).

Amends [ADR-003](./003-installments-and-savings-funding.md): supersedes
"Reimbursements are unchanged ... remain unlinked to expenses", the
combination table's reimbursement column, the `transactions_schedule_expense_only`
constraint for reimbursements, and the consequence "Accepted: reimbursing a
savings-funded purchase still widens `effectiveLimit`".

Amends [ADR-004](./004-goal-transfers.md): supersedes "Reimbursements are
unchanged and still unlinked to purchases; a reimbursement never refills a
Goal", the `Reimbursement X` row of its rules table, the consequence
"Reimbursing a savings-funded purchase does not refill the Goal", and the list of
`goal_transfers` kinds and its `(kind = 'withdrawal') = (transaction_id IS NOT NULL)`
check. Every other decision in ADR-001 to ADR-005 is unchanged.

## Context

A reimbursement has its own category and date but no relation to any purchase
(ADR-002, ADR-003). Two real problems follow:

1. A purchase covered by savings never counted against the month's budget or
   savings rate (ADR-003), but its reimbursement does: it widens
   `effectiveLimit` and raises the savings rate for money that never left the
   month's income.
2. That purchase withdrew its full amount from a Goal (ADR-004), and the
   reimbursement does not return it; the user must deposit by hand.

Also, nothing prevents recording more reimbursements against an expense than the
expense's amount, because Finora cannot tell which expense a reimbursement refers
to.

## Decision

- **A reimbursement optionally points to one purchase.** `transactions` gains
  `refunds_transaction_id uuid` referencing `transactions(id)`, `NO ACTION`
  (not `RESTRICT`, so deleting an account can still cascade in any order, as with
  `goal_transfers.goal_id` in ADR-004), null by default, with an index. Checks:
  the column is null unless `type = 'reimbursement'`, and never equals `id`. The
  link is optional; an unlinked reimbursement behaves exactly as before.
  Many reimbursements may point to one purchase (partial refunds).
- **Backfill: none.** Existing rows keep a null link. Every existing
  reimbursement already has `funding_source = 'income'` and
  `installment_months = 1` (`transactions_schedule_expense_only`), so all
  income-funded reimbursement predicates below hold for them and no figure
  changes.
- **`funding_source` of a reimbursement.** A reimbursement linked to a
  savings-funded purchase has `funding_source = 'savings'`, meaning its money
  returns to savings; every other reimbursement has `'income'`. The RPC derives
  it from the purchase; the client never sends it. A check requires a link
  whenever a reimbursement has `'savings'`. `transactions_schedule_expense_only`
  is replaced by a check that still forbids installments outside expenses but
  allows `'savings'` on reimbursements. The ADR-004 invariant becomes:
  `funding_source = 'savings'` if and only if exactly one `goal_transfers` row
  references the transaction (a `withdrawal` for an expense, a `refund` for a
  reimbursement), written only by `save_transaction`.
- **Returning money to the Goal: a new `goal_transfers` kind, `refund`.**
  The row is keyed on the **reimbursement's** id (`transaction_id`), goes to the
  Goal of the purchase's withdrawal, is dated with the reimbursement and has
  the reimbursement's amount. Each transaction therefore still has at most one
  transfer, so `transaction_id` stays `unique` (and PostgREST still embeds it as
  one-to-one). `goal_transfers_kind_values` gains `'refund'` and
  `goal_transfers_withdrawal_linked` becomes
  `(kind in ('withdrawal','refund')) = (transaction_id is not null)`. The balance
  trigger already adds every kind except `withdrawal`, so it is unchanged. RLS is
  unchanged: clients can only insert and delete deposits, so `refund` rows are
  written only by `save_transaction`. `totalDepositedToGoals` filters
  `kind = 'deposit'`, so a refund is not "Saved to goals".
- **Cap.** The sum of reimbursements linked to a purchase never exceeds the
  purchase's amount (the total, also for financed purchases). It is checked in
  the RPC in `numeric` (exact), after taking `FOR UPDATE` on the purchase in a
  statement earlier than the sum; the client pre-checks with the cents helpers of
  ADR-005 for the message only. The remaining amount is shown but never
  prefilled into the amount input, since a value computed in JavaScript is never
  sent as an amount (ADR-005).
- **Category and date.** A linked reimbursement must have the purchase's
  category (`refund_category_mismatch`; the RPC rejects, never overrides) and a
  date on or after the purchase's date (`refund_before_purchase`). Changing a
  purchase's category updates its linked reimbursements in the same transaction;
  changing its date to after its earliest reimbursement is rejected.
- **A purchase with linked reimbursements is frozen** in the ways that would
  change what its reimbursements mean: its type, its funding source and its Goal
  cannot change (`purchase_has_linked_refunds`), and its amount cannot go below
  the sum of its reimbursements (`refund_exceeds_purchase`). To change them, the
  reimbursements are unlinked or deleted first. Deleting a purchase with linked
  reimbursements is rejected by the foreign key (`23503`, mapped by the client,
  which names the reimbursements that reference it); cascading or `SET NULL`
  would either delete user data silently or leave the Goal credited twice.
- **One writer.** `save_transaction` gains `p_refunds_transaction_id uuid default
  null`; the old 10-argument signature is dropped, and the default lets the
  migration be applied before the client is deployed. Lock order: target
  purchase, then the transaction being saved and (for a purchase) its linked
  reimbursements, then Goals in id order, so concurrent edits cannot deadlock.
  New codes: `invalid_refund_link`, `refund_category_mismatch`,
  `refund_before_purchase`, `refund_exceeds_purchase` (detail: the remaining
  amount) and `purchase_has_linked_refunds`. Deleting a reimbursement stays a
  plain delete: the `refund` row cascades, the trigger takes the money back, and
  the deferred constraint raises `goal_balance_negative` if the Goal already
  spent it.
- **Financed purchases.** A reimbursement may be linked to a financed purchase.
  There is no proration: it counts in full in its own month, as in ADR-003, and
  for a savings-funded purchase the Goal receives it in full on the
  reimbursement's date (the Goal already lost the full amount on the purchase
  date, ADR-004). Monthly "covered by savings" figures stay gross, as ADR-002
  keeps spend gross. Returning a whole financed purchase is still done by editing
  or deleting the purchase.
- **Figures.** A reimbursement counts toward `effectiveLimit` and the savings
  rate only when it is income-funded (`isIncomeFundedReimbursement`); one linked
  to a savings-funded purchase counts toward neither. The Dashboard balance
  ignores reimbursements today (ADR-004) and is unchanged.

- **Rules per event:**

  | Event | Goal balance | `spent` / `totalSpent` / trend | `effectiveLimit` | Savings rate | Dashboard balance | Saved to goals |
  |---|---|---|---|---|---|---|
  | Unlinked reimbursement X | - | unchanged | +X in its month | nets X | unchanged | - |
  | X linked to a purchase funded by income (single or N months) | - | unchanged (gross) | +X in X's month, in full | nets X in X's month | unchanged | - |
  | X linked to a purchase covered by savings from Goal G (single or N months) | +X in G, dated X's date | 0 | unchanged | unchanged | unchanged | - (not a deposit) |
  | Edit linked X (amount, date) | old refund undone, new applied; rejected if over the cap, before the purchase, or G would go below 0 | unchanged | moves with X (income-funded) | moves with X (income-funded) | unchanged | - |
  | Delete linked X | -X from G; rejected if G would go below 0 | unchanged | -X (income-funded) | reverts (income-funded) | unchanged | - |
  | Unlink X, or change its type away from reimbursement | as delete, then X is standalone | unchanged | standalone rules | standalone rules | unchanged | - |
  | Link an existing X to a savings-funded purchase | +X in G | unchanged | -X in X's month | reverts in X's month | unchanged | - |
  | Edit the purchase: amount | not below the sum of its reimbursements; own withdrawal as in ADR-004 | ADR-003 | - | - | - | - |
  | Edit the purchase: date | not after its earliest reimbursement | ADR-003 | - | - | - | - |
  | Edit the purchase: category | linked reimbursements follow it | ADR-003 | follows | - | - | - |
  | Edit the purchase: type, funding or Goal | rejected while reimbursements are linked | - | - | - | - | - |
  | Delete a purchase with linked reimbursements | rejected | - | - | - | - | - |

## Implementation

- Migration `supabase/migrations/<timestamp>_refund_links.sql`: the column,
  checks and index; the replaced `transactions_schedule_expense_only`; the
  rewritten `goal_transfers` checks; `drop function` of the 10-argument
  `save_transaction` and the new 11-argument one, with the same `revoke`/`grant`
  and `security definer` / `search_path = ''` as before. No data pre-flight is
  needed (additive column). Before applying, the live database is checked for
  constraints, triggers and indexes on `transactions` and `goal_transfers` that
  the repository's migrations do not show (for example the rule that a
  reimbursement has a category).
- `domain/installments.ts`: `isIncomeFundedReimbursement`. `domain/category.ts`:
  `getReimbursementsByCategory` uses it. `services/analyticsService.ts`:
  `sumLedgerTotals` counts only income-funded reimbursements in
  `totalReimbursed` and never lets a savings-funded one fall into `totalIncome`.
  `domain/refund.ts`: remaining refundable amount (cents helpers) and a summary
  of reimbursements per purchase. `GoalTransferKind` gains `refund`.
- `services/transactionsService.ts`: `saveTransaction` sends the link;
  `getRefundablePurchases`. `services/moneyMovementErrors.ts`: the five codes and
  the `23503` mapping. The transaction's `withdrawal` embed becomes
  `goal_transfer` with its `kind`.
- UI, all copy in `en` and `es`: a "Which purchase is this refund for?" optional
  selector in Add Transaction (category locked, Goal notice for savings-funded
  purchases, cap and date checks), link text in `TransactionItem`, and refund rows
  in the Goal Activity.
- Delivery: two pull requests. The first carries this ADR, the migration, the
  domain and the services, and changes nothing visible because no UI creates
  links yet; the second carries the UI and depends on the first.

## Consequences

- **Savings-funded purchases stay coherent**: their refunds return to the Goal
  and stop inflating the budget limit and the savings rate.
- **Income-funded refunds are unchanged in figures.** The link adds traceability
  and a cap, not a different number. A refund dated in another month still widens
  that month's limit (ADR-002).
- **Retroactive effects.** Linking or unlinking an existing reimbursement changes
  figures of its month, as every edit does (no snapshots, ADR-003).
- **`funding_source` now has a second meaning on reimbursements** ("returns to
  savings"). Every consumer of it must be aware of the type:
  `TransactionItem` and the Add Transaction preload only read it for expenses.
- **A purchase with refunds is harder to change and impossible to delete** until
  its refunds are unlinked or deleted. This is intended; the error names the
  cause.
- **Deleting a reimbursement can fail** with `goal_balance_negative` if the Goal
  spent the refunded money, like deleting a deposit (ADR-004).
- **One reimbursement cannot be split across several purchases.**
- **Dashboard balance still ignores reimbursements** (pre-existing, out of scope).
- **Goals cannot be deleted** while any transfer references them, so a refund's
  Goal cannot disappear.
- **Alternatives considered (rejected):**
  - *A `transaction_refund_links` table with an allocated amount*: allows one
    refund to be split across purchases, but adds a second invariant (allocations
    add up to the refund), RLS, cascades and joins, for a need nobody has.
  - *A cached `refunded_amount` on the purchase*: can drift; the sum is cheap.
  - *`refund_of_transfer_id` on `goal_transfers` only*: does not cover
    income-funded purchases and cannot enforce the cap.
  - *Keying the refund transfer on the purchase, with a partial unique index per
    kind*: two refunds of one purchase would collide, and PostgREST would stop
    embedding the transfer as one-to-one.
  - *Negative withdrawals*: violate `amount > 0`.
  - *Reading the purchase's funding through a self-embed instead of storing it on
    the reimbursement*: no constraint change, but three analytics queries, row
    flattening and every mock change.
  - *`SET NULL` or cascade on purchase deletion, or a `BEFORE DELETE` trigger*:
    double-credits the Goal, silently deletes data, or blocks deleting an account.
  - *Auto-converting linked reimbursements when a purchase changes funding*:
    rewrites past figures and needs Goal funds.
  - *Restoring the budget of the purchase's month for income-funded refunds*:
    contradicts ADR-002's accepted date scoping.
  - *Prorating a refund across installments*: not modelled anywhere today.
  - *Prefilling the remaining amount into the input*: a computed amount sent to
    the database (ADR-005).
