# 003. Financed purchases (monthly installments) and savings-funded expenses

## Status

Accepted

Amends [ADR-002](./002-gross-spend-and-effective-limit.md): the definition of
gross `spent` / `totalSpent` (and the trend buckets that move in lockstep with it)
changes from "sum of expense amounts dated in the period" to "sum of the
income-funded expense *installments* that fall in the period." ADR-002's
`effectiveLimit`, its savings-rate netting of reimbursements, and ADR-001's rollup
scope (`getCategoryIdsForRollup`) and reimbursement-must-have-a-category invariant
are unchanged.

## Context

Every figure in Finora — Budgets `spent`, Analytics `totalSpent`, "Spending by
category", the "Spending over time" trend chart, period comparison, and the
Dashboard stat cards — is derived the same way: filter `transactions` by `date`
within a period and sum `amount` (`transactionsService.getExpensesByCategory`,
`analyticsService.getMonthlyStats`, and the shared trend bucketing helper). Two
real situations break that model:

1. **Financed purchases (MSI, *meses sin intereses*).** A $20,000 Travel purchase
   on a credit card at 12 monthly installments without interest lands entirely in
   the purchase month, although the card actually charges ~$1,666.67 per month for
   12 months. The purchase month looks catastrophic and the following 11 look
   artificially cheap — every monthly view misrepresents real cash flow.
2. **Expenses covered by savings.** When an expense (or a financed purchase's
   installments) is paid from money saved earlier rather than from the month's
   income, counting it against that month's budget and savings rate reports a
   shortfall that the month's income never had.

These are two **independent, combinable** dimensions: a purchase is either paid
once or financed over N months, and either funded by income or by savings.

Reimbursements must keep working exactly as ADR-001/002 define them. Today a
`reimbursement` row has a `category_id` (DB-enforced) and its own `date`, but no
link to any specific expense; it counts in full in the period of its own date,
widening that category rollup's `effectiveLimit` and reducing
`netSpentForSavings`, and never touching `spent`.

Money is currently represented as JavaScript `number`s end to end
(`Transaction.amount`, `TransactionPayment.amount`, `Budget.monthly_limit`), and all
aggregations are floating-point additions. Splitting an amount into N installments
introduces a division whose result is generally not exact (20000 / 12), so this ADR
must specify a deterministic allocation with no lost cents.

## Decision

- **One row per purchase; installments are derived at query time, never stored.**
  `transactions` gains:
  - `installment_months smallint not null default 1`, constrained to `1..48`;
  - `funding_source text not null default 'income'`, one of `'income' | 'savings'`;
  - `last_installment_date date`, generated as
    `(date + make_interval(months => installment_months - 1))::date`;
  - a check `type = 'expense' OR (installment_months = 1 AND funding_source = 'income')`
    — income and reimbursement rows can never be financed or savings-funded.

  Existing rows receive the defaults, so `last_installment_date = date` and their
  behavior is identical to today. `amount` remains the purchase total and
  `transaction_payments` keeps summing to it.

- **Installment dates.** `date` is the purchase date **and** the date of the first
  installment. Installment `k` (0-based) is dated `k` months after `date`, on the
  same day of the month, clamped to that month's last day (Jan 31 → Feb 28/29),
  matching Postgres interval arithmetic so the JS schedule and
  `last_installment_date` always agree. A user whose card starts charging the
  following month records the purchase with that date.

- **Period queries.** Every period query changes its filter from
  `date >= start AND date <= end` to `date <= end AND last_installment_date >= start`,
  then a pure domain function expands each row into its installments and keeps only
  those dated within the range. For non-financed rows this is exactly today's
  filter and a pass-through expansion.

- **Deterministic allocation, no lost cents.** For `installment_months = N > 1`:
  convert `amount` to integer minor units (cents) — **rejecting, never rounding**,
  any amount not representable in 2 decimals — compute `base = floor(cents / N)`,
  `r = cents - base * N`, and give the first `r` installments `base + 1` cents and
  the rest `base`. Installments always sum to exactly `amount`:
  $20,000 / 12 = 8 × $1,666.67 + 4 × $1,666.66. For `N = 1` the amount passes
  through untouched, with no conversion.

- **A financed purchase has exactly one payment method** (any method, not
  hard-coded to "Credit Card"). Financing is a property of one payment instrument;
  a purchase paid partly another way is recorded as two transactions.

- **Funding source is per transaction**, shared by all of its installments.

- **`spent` (amends ADR-002)** = sum of the installment amounts of `expense` rows
  with `funding_source = 'income'` that fall in the period, for the category's
  rollup scope. It is used unchanged by every caller ADR-002 lists — Budgets
  `spent` and its subcategory breakdown, Analytics `totalSpent`, "Spending by
  category", period comparison, and the trend buckets — so Budgets and Analytics
  still cannot disagree about what a category's spend means.

- **Savings-funded installments** are excluded from `spent`, `totalSpent`, the trend
  buckets and the savings rate **everywhere** (not only in Budgets), and reported as
  their own figure — `totalCoveredBySavings` (Analytics/Dashboard) and a per-rollup
  `savingsCovered` (Budgets) — so they are never silently hidden.

- **Reimbursements are unchanged.** They are never financed, never savings-funded
  and never spread across months. Each counts in full in the period of its own
  date, widening `effectiveLimit` for its category rollup and reducing
  `netSpentForSavings`, exactly as in ADR-002, regardless of how the purchase it
  refunds was financed or funded. Reimbursements remain unlinked to expenses.

- **Combination rules** for one underlying purchase (the reimbursement column is a
  separate reimbursement row of amount X dated in month R, and behaves identically
  in every case):

  | Financing | Funding | Where the purchase counts | Reimbursement X in month R |
  |---|---|---|---|
  | Single | income | Full amount in the purchase month: `spent`, `totalSpent`, category, trend, savings rate | Month R only, in full: `effectiveLimit += X` for its category rollup; `netSpentForSavings -= X` |
  | Single | savings | 0 in all of the above; full amount in `totalCoveredBySavings` / `savingsCovered` in the purchase month | Same |
  | N months | income | Installment k counts in its own month, in all of the above | Same |
  | N months | savings | Installment k goes to `totalCoveredBySavings` / `savingsCovered` in its own month; 0 in `spent` | Same |

## Implementation

- `src/apps/finora/domain/installments.ts` (pure, Supabase-independent,
  unit-tested): `toMinorUnits`, `allocateInstallments(amount, months)`,
  `getInstallmentDate(anchorDate, index)`, `expandLedgerRowsInRange(rows, range)`,
  `isIncomeFundedExpense(entry)`, and form-level schedule validation (expense-only,
  whole months in `2..48`, a single payment method, at most 2 decimals). Includes a
  test that `getInstallmentDate(date, N - 1)` matches Postgres'
  `last_installment_date` for month-end anchors (Jan 31, leap years).
- `domain/category.ts`: `CategoryLedgerEntry` gains `funding_source`;
  `getRawGrossSpendByCategory` (and therefore `getGrossSpendByCategory`) sums only
  `isIncomeFundedExpense` entries; `getSavingsCoveredByCategory` is added over the
  same rollup. The per-category filtered sum shared by gross, reimbursement and
  savings-covered totals is extracted into one private helper, since it would
  otherwise exist three times.
- `services/transactionsService.ts`: `getExpensesByCategory` selects
  `date, installment_months, funding_source`, filters with
  `.lte('date', end).gte('last_installment_date', start)`, expands rows, and
  returns `savingsCovered` alongside `totals`, `raw` and `reimbursements`.
  `NewTransactionInput` gains `installment_months` and `funding_source`.
- `services/analyticsService.ts`: `getMonthlyStats` and the expense/reimbursement
  row fetch use the same filter and expansion; the trend bucketing helper buckets
  each installment by its own date and skips savings-funded ones; `MonthlyStats`
  gains `totalCoveredBySavings`. `getSavingsRate` is unchanged.
- `hooks/useBudgets.ts`: `BudgetWithProgress` gains `coveredBySavings`.
- UI:
  - `pages/AddTransaction.tsx`: an expense-only "Payment plan" `<fieldset>` after
    the payment methods and before the date — a "Financed in monthly installments"
    checkbox revealing a months input (2–48) and a `role="status"` per-month
    preview computed with the same domain functions, plus a "Covered by savings"
    checkbox with a hint. For income/reimbursement the fieldset is hidden and the
    defaults are always submitted. In edit mode, a note warns that changing a
    financed purchase that started in a past month also updates past months.
  - `TransactionItem`: shows "N monthly payments · $X/mo" and "Covered by
    savings" as text (not color alone); the row keeps showing the purchase total.
  - `BudgetCard`: notes "Excludes $X covered by savings" when non-zero.
  - `Dashboard` / `Analytics`: the "has data" checks also consider
    `totalCoveredBySavings`.
  - All new copy in both `en` and `es` locale files.
- Migration:

      alter table transactions
        add column installment_months smallint not null default 1
          check (installment_months between 1 and 48),
        add column funding_source text not null default 'income'
          check (funding_source in ('income', 'savings')),
        add constraint transactions_schedule_expense_only
          check (type = 'expense' or (installment_months = 1 and funding_source = 'income'));
      alter table transactions
        add column last_installment_date date
          generated always as ((date + make_interval(months => installment_months - 1))::date) stored;

  This assumes `transactions.date` is `date` and `transactions.amount` is `numeric`;
  both must be confirmed in Supabase before the migration runs. If Postgres rejects
  the generated expression, a `before insert or update` trigger computing the same
  value is the fallback.

## Consequences

- **Monthly figures follow cash flow.** A 12-installment purchase contributes one
  installment per month to Budgets, Analytics and Dashboard. The current month's
  budget now includes installments of purchases made in earlier months, which is
  intended.
- **The subcategory breakdown still reconciles** with the budget's `spent`: both
  come from the same filtered, expanded entries through the same rollup.
- **Edits recompute the full schedule after the fact.** Changing the amount, months, date or
  category of a financed purchase changes past months' figures. This matches
  existing behavior — every figure is already recomputed from transactions and
  there are no period snapshots.
- **Every period query now expands rows.** Non-financed rows pass through
  unchanged; the extra rows fetched are only the active financed purchases.
- **The Transactions list stays purchase-level**: one row, full amount, purchase
  date, with installment information as secondary text. Search and filters are
  unchanged; deleting the row removes all its installments.
- **Savings rate and the Dashboard balance exclude savings-funded spending.** The
  balance (`totalIncome - totalSpent`) becomes "balance from this month's income",
  a visible change.
- **Accepted: reimbursing a savings-funded purchase still widens `effectiveLimit`
  and raises the savings rate** in the reimbursement's own month, because
  reimbursements are not linked to the expense they refund, so there is no way to
  know the refunded purchase was savings-funded. This is consistent with ADR-002's
  accepted treatment of refunds landing in a different period, and linking
  reimbursements to purchases is explicitly out of scope.
- **Returning a financed purchase** should be recorded by editing or deleting the
  purchase, not with a reimbursement, since the issuer cancels the remaining
  installments; a reimbursement would leave the future installments counting.
- **No new negative figures.** `spent` remains a sum of non-negative installments;
  `effectiveLimit` only grows; `netSpentForSavings` could already be negative under
  ADR-002.
- **"Covered by savings" is a declaration, not a ledger movement.** It is not
  linked to Goals and does not reduce any goal's `current_amount`; Finora has no
  savings balance to validate it against. Linking it to a goal withdrawal is
  possible future work.
- **Money representation.** Each installment is exact to the cent, but downstream
  sums remain floating-point additions of `number`s (pre-existing). An end-to-end
  integer-minor-units representation should be decided in its own ADR rather than
  inside this feature.
- **Funding source cannot vary per installment** (e.g. first 3 installments from
  savings). Supporting that would require stored installment rows, rejected below.
- **Alternatives considered (rejected):**
  - *Materializing N installment rows in `transactions` (with `parent_id`)*:
    existing date filters would work unchanged, but the list would show N rows per
    purchase, every edit becomes delete-and-recreate of N rows plus their payments,
    and create/update grow from 2 to 2N non-atomic writes.
  - *A separate `transaction_installments` table*: PostgREST cannot union it with
    `transactions`, forcing two queries per aggregation, or a backfill giving every
    expense a schedule row; changing the rounding rule later would need a data
    migration.
  - *Remainder on the first or last installment only*: also deterministic, but
    produces one visibly different installment; spreading one cent across the
    first `r` keeps every installment within one cent of the others.
  - *Excluding savings-funded spending from Budgets only*: breaks the ADR-001/002
    guarantee that Budgets and Analytics compute category spend with one shared
    function.
  - *Allowing `funding_source` / `installment_months` on income or reimbursements*:
    no current requirement, and it would make a reimbursement's effect depend on
    hidden flags.
