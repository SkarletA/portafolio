# 010. Household expenses without a split, and household budgets

## Status

Accepted

Amends [ADR-009](./009-shared-expense-split.md): narrows the claim "The split
is accounting, not a visibility rule... the full amount still counts against
the category and budget of whoever recorded the transaction" to apply only
when that budget is not marked `is_household` (see Decision below). Every
other decision in ADR-009 - the shape of `transaction_shares`, its v1
restrictions, "only the owner can create, edit or delete a shared expense" -
is unchanged and still applies exactly to what this ADR calls Case A.

## Context

ADR-009 modeled "compartido" as one thing: a transaction whose amount is
split between the owner and their household partner, both amounts typed at
save time and summing to the total (`transaction_shares`). Real use after
PR3-PR5 shipped surfaced a second, genuinely different case the product
needs, described by the user with concrete examples:

- **Case A ("Rent")** - already supported by ADR-009 as-is. The total is
  literally divided between two people in one transaction: "$15,200 de
  renta, yo pago $5,100, mi pareja paga $10,100." One row, two exact
  amounts, `transaction_shares`.
- **Case B ("Medicine / gas")** - not supported, and the friction was real:
  "en medicina gasté 250 pero es un gasto del hogar... mi esposo gastó en
  gas 800... porque los gastos del hogar pertenecen a un mismo bolsillo."
  Nothing is split here. Each person pays their own expense in full and
  simply tags it as counting toward the household, independent of the
  other person's amount. The Add Transaction form, built only for Case A,
  forced a second (irrelevant) amount onto this case - the reported bug.

The product also asked for a **household budget**: a budget (e.g. "Rent")
that both members' contributions cover together, shown as two entries, one
per person - "si tenemos uno de alquiler yo abono cierta cantidad y mi
esposo abona cierta cantidad cubrimos el total del budget... en ese budget
vería dos entradas." `budgets` has been strictly per-`user_id` since before
any of this, with no schema change through ADR-007/009 - this ADR is what
opens it, deliberately and narrowly.

## Decision

- **`transactions.is_household_expense boolean`, a new and separate
  concept from `is_shared`.** Rejected: reusing `transaction_shares` with a
  single 100%-owner row for Case B. ADR-009's `save_transaction` already
  enforces "exactly two rows whenever `is_shared` is true"
  (`jsonb_array_length(p_shares) <> 2`); relaxing that invariant would need
  a second discriminator to know which validation to run - i.e. a new flag
  regardless, just hidden worse. `TransactionItem`/`AddTransaction` already
  read `transaction.shares` assuming a real split ("your part of the
  total"); reusing the table for a no-split declaration would force that UI
  to distinguish "a real split" from "a declaration with no split" anyway.
  A plain boolean on `transactions` is simply what Case B is: nothing to
  reconcile, nothing to store on a second person's behalf.
- **Mutual exclusion**: `not (is_shared and is_household_expense)`. A
  transaction is Case A, Case B, or neither, never both - a split expense is
  already "of the household" by definition and needs no second tag.
- **Case B does not inherit Case A's v1 restrictions, and this is
  deliberate, not an oversight.** ADR-009's restrictions
  (`funding_source='income'`, `installment_months=1`, no reimbursement
  link) exist because *splitting an amount between two people* interacts
  with financing, savings and refunds (financing a split would need
  ADR-003's installment allocation run twice - once per month, once per
  person within each month; a refund to a split purchase would not know
  who to return money to). Case B splits nothing, so none of that applies:
  it can be financed, it can be `funding_source='savings'`, it can receive
  a reimbursement, all exactly as an ordinary personal expense today. The
  only constraint is `type = 'expense'` (Case A's own restriction, for the
  same reason: income/reimbursement rows have no "household" meaning in
  v1) and an active household, the same `household_required_for_*` shape
  ADR-009 already uses - even though Case B writes no `transaction_shares`
  row, the flag is meaningless without a partner to share the household
  with.
- **`save_transaction` gains `p_is_household_expense boolean default
  false`** (13th argument; the default lets this migration deploy before
  the client does, the same rollout ADR-006 and ADR-009 already used for
  their own new arguments). New error code
  `household_required_for_household_expense`, parallel to ADR-009's
  `household_required_for_shared_expense`. Requesting both
  `p_is_household_expense` and a non-empty `p_shares` in the same call is
  rejected with ADR-009's existing `invalid_share_plan` - a combination
  the v1 form will never offer (PR7), caught here as the authoritative,
  friendly-error backstop in front of the table's own mutual-exclusion
  check.
- **`budgets.is_household boolean not null default false`. No new table,
  no `household_id` column, no RPC.** `budgets` keeps exactly one owning
  `user_id` (who created it, the only one who can edit or delete it -
  unchanged from ADR-007's RLS, write stays self-only) and one
  `monthly_limit` set by that owner - a single combined limit, matching
  "cubrimos el total del budget" (one target, not two parallel ones).
  Unlike `transactions`, `budgets` has no RPC today (`createBudget` is a
  plain `insert`) and gains none here: nothing about `is_household` needs
  cross-row atomicity the way `save_transaction` protects
  `transactions`+`transaction_payments`+`goal_transfers` together - it is
  one more column on one row, safely written by a plain insert exactly like
  every other budget field.
- **What counts toward a household budget is exactly what is explicitly
  tagged - Case A's share amounts and Case B's full amount - from either
  member, in that budget's category.** A purely personal expense (neither
  `is_shared` nor `is_household_expense`) in that same category, by either
  member, never counts, even on a household budget. This is the same
  principle ADR-009 already established for Case A ("compartido es una
  decisión por transacción, no una regla fija por categoría") extended to
  Case B: tagging is always an explicit, per-transaction choice, never
  inferred.
- **The "two entries" are computed, not stored.** A household budget's
  per-member figures are assembled by calling the existing, untouched
  `getGrossSpendByCategory` (ADR-001/002/003) twice - once against the
  caller's own tagged entries in that category, once against the partner's
  - rather than teaching that function anything about households. No new
  function in `domain/category.ts` is needed for this: the two totals are
  two ordinary calls to the function that already exists, fed two
  different, already-filtered entry lists. `getGrossSpendByCategory` itself
  keeps zero knowledge that households exist.
- **`getBudgets()` stays self-only in this PR.** Widening it to read a
  household member's `is_household` budgets (RLS from ADR-007 already
  permits it) is real, needed work, but has no consumer until the budget UI
  (PR8) exists to display it - building it now would be exactly the
  speculative architecture this project avoids. Tracked explicitly here so
  it is a deliberate deferral, not a gap discovered later.
- **Open risk, accepted for v1, not solved here:** nothing stops both
  members from independently creating a competing `is_household=true`
  budget in the same category (`budgets` has no uniqueness across members
  by category). Not worth a table or a constraint for a two-person case;
  the fix is a UI guard in the budget-creation screen (PR8): if a household
  budget already exists in that category among the household's members,
  offer to join/edit it instead of creating a second one.

## Implementation

- This PR (data model + RPC only, no UI - same staged rollout ADR-006/009
  used): migration adding `transactions.is_household_expense` +
  `transactions_household_or_shared_exclusive` constraint, `budgets.is_household`,
  and the rewritten `save_transaction` (13 arguments). `domain/transaction.ts`
  gains `is_household_expense: boolean`; `domain/budget.ts` gains
  `is_household: boolean`. `services/transactionsService.ts`:
  `NewTransactionInput.is_household_expense?`, `saveTransaction` sends
  `p_is_household_expense`. `services/budgetsService.ts`:
  `NewBudgetInput.is_household?` (flows through `createBudget`'s existing
  spread with no other code change). `services/moneyMovementErrors.ts`: the
  one new code. No UI sends `is_household_expense: true` or creates an
  `is_household` budget yet, so nothing visible changes.
- A later PR (UI, PR7): the "Es 100% mío pero cuenta para el hogar" choice
  in Add Transaction (mutually exclusive with "Dividir el monto"/Case A),
  and `TransactionItem`'s tag for it. The Transactions "Household" tab's
  filter (`transaction.is_shared`, fixed in PR5's follow-up commit) extends
  to `is_shared || is_household_expense` here too.
- A later PR (UI, PR8): the household-budget toggle in Add Budget (enabled
  only with an active household), `getBudgets()` widened the same way
  `getTransactions(householdMemberIds?)` already was in PR5, the two-entry
  breakdown in `BudgetCard`/`BudgetCardBreakdown` (built from two
  `getGrossSpendByCategory` calls, per the Decision above), and the
  competing-household-budget UI guard.

## Consequences

- **A shared expense (Case A) and a household-tagged expense (Case B) are
  mutually exclusive and permanently distinguishable** - a consumer that
  needs "everything that counts toward the household" checks
  `is_shared OR is_household_expense`; one that needs only real splits
  checks `is_shared` alone, unaffected by Case B existing.
- **Case B is strictly simpler than Case A**, not just different: no new
  restriction interacts with financing, savings or refunds, because nothing
  is split.
- **A personal (non-tagged) budget's behavior and performance are
  completely unaffected** - `getBudgets()`, `getExpensesByCategory` and
  `getGrossSpendByCategory` run exactly as before for the majority case
  (`is_household = false`), with zero added household-awareness inside
  those functions.
- **A household budget's limit is one number the creator sets**, not two
  independent limits - consistent with "cubrimos el total," but means the
  creator, not each member individually, decides what "on track" means for
  that category.
- **Two members can accidentally create competing household budgets in the
  same category** until the PR8 UI guard exists; documented as an accepted
  v1 gap, not a bug to fix here.
- **Alternatives considered (rejected):**
  - *Collapsing Case B into `is_shared` with a 100%/0% split*: the
    reviewer's own stated reason for rejecting this - `is_shared` already
    carries v1 restrictions tied to splitting amounts; a 100/0 "split"
    would trigger those restrictions for a case that has nothing to do with
    them, forcing a special-case exception inside the already-restricted
    path instead of a clean, unrestricted one.
  - *A household budget as a new table or a `household_id` on `budgets`*:
    would duplicate `Budget`/`BudgetWithProgress`'s shape, `useBudgets.ts`
    and `BudgetCard`, and lose reuse of the already-proven
    `getBudgetProgress`/effective-limit logic, for a change that is really
    just "what counts toward `spent`," not a different kind of entity.
  - *A database constraint preventing competing household budgets per
    category*: more machinery than a two-person household warrants; a UI
    guard in the (not-yet-built) creation screen is enough for v1.
  - *Teaching `getGrossSpendByCategory` about households directly*: would
    contaminate a function ADR-001/002/003 spent three ADRs making
    provably correct for the single-user case, with a concept it was never
    designed to know about. Two ordinary calls to the unchanged function,
    fed pre-filtered entries, achieves the same result at the service
    layer instead.
