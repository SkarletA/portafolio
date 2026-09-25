# 005. Money arithmetic in the client: numbers at the boundary, cents for sums and comparisons

## Status

Proposed

Fulfils the note in [ADR-003](./003-installments-and-savings-funding.md)
("Money representation"): an end-to-end integer-minor-units representation was
to be decided in its own ADR. This ADR decides against a full migration and
sets a narrower rule instead. It changes no decision in ADR-001 to ADR-004.

## Context

Money is stored in Postgres as `numeric`, and since ADR-003/ADR-004 the
operations that matter most for correctness run there: `save_transaction`
checks that payments add up to the amount and that a Goal has enough funds,
a trigger keeps `goals.current_amount` in step with `goal_transfers`, and the
RPCs and `goal_transfers` CHECKs reject amounts with more than 2 decimals
(`supabase/migrations/20260923120000_goal_transfers.sql`).

The client still receives every amount as a JavaScript `number` (PostgREST
returns `numeric` as a JSON number) and does arithmetic with it. An audit of
`src/apps/finora` found:

- **All aggregates are computed in JavaScript with floating-point addition:**
  `spent` per category and its rollup (`domain/category.ts`), `totalSpent`,
  `totalIncome`, `totalReimbursed`, the trend buckets and the period comparison
  (`services/analyticsService.ts`), `effectiveLimit` (`hooks/useBudgets.ts`)
  and the Dashboard balance (`pages/Dashboard.tsx`). No view or function in the
  database aggregates anything.
- **Nothing computed in JavaScript is sent to the database.** Every amount
  sent is `Number(text)` of what the user typed; the database validates it.
  The one exception in shape is `AddBudget`, which inserts `monthly_limit`
  directly without the decimal handling the other forms have.
- **Exactly where JavaScript compares or thresholds a sum, floating point can
  give a wrong answer:** `AddTransaction.tsx` compares the assigned payments
  with `!==` for its warning colour but with a `0.001` tolerance for
  validation; `getBudgetProgress` turns `spent / limit * 100` into a status at
  exactly 80 and 100; `getPercentChange` and the Analytics insights test
  `=== 0` on a difference of two sums. Each is an edge case (a total landing
  exactly on a threshold, or two periods with the same total but different
  rounding noise), not a common one. For example `0.7 + 0.1` is
  `0.7999999999999999`, so a spend that exactly reaches an `0.8` limit shows
  `near-limit` instead of `exceeded`.
- Values shown with 2 decimals cannot be wrong at this scale: the accumulated
  error of hundreds of additions of 2-decimal amounts is around 1e-11, far
  below half a cent, and the exact sum of 2-decimal values is never on a
  half-cent boundary.
- Two places already sum in integer cents (`domain/goal.ts`
  `getAvailableForExpense`, and `totalDepositedToGoals` in
  `services/analyticsService.ts`), using `toMinorUnits`.

Verified against the live database (2026-09-25):

- `transactions.amount`, `transaction_payments.amount`, `budgets.monthly_limit`
  and `goals.current_amount`/`target_amount` are `numeric(12,2)`;
  `goal_transfers.amount` is unconstrained `numeric` with the ADR-004 CHECKs.
- No row in `transactions` (13), `transaction_payments` (14) or `budgets` (5)
  has more than 2 decimals.
- Because those columns are `numeric(12,2)`, an insert that carries more than
  2 decimals is rounded by the database without a word, and an amount of
  10^10 or more fails with a raw `numeric field overflow`. The first matters
  for `AddBudget`, which inserts `monthly_limit` directly; the second for
  `save_transaction`, which has no upper bound of its own.

The rule in CLAUDE.md is not to use floating-point arithmetic for financial
values. The current code follows it where the database or `toMinorUnits` is
involved and does not follow it for aggregates and comparisons.

## Decision

- **Postgres stays the source of truth and the authority for anything
  persisted.** No change to how amounts are stored, validated or written.
- **Amounts stay `number` in domain types, services, hooks and components.**
  No branded `Money` type, no library, no integer-cents types, and no change
  to `formatCurrency`. Amounts cross the client/database boundary as
  JSON numbers parsed from the user's decimal text, as today.
- **A rule for arithmetic on amounts:**
  1. A sum or difference of amounts that is compared, tested for equality or
     zero, used against a threshold, or shown as a money figure goes through
     the cents helpers below. Plain `+`/`-` on amounts is not allowed there.
  2. A ratio (percentage, average per day) may use floating-point division,
     for display only, and its result is never compared with another amount.
  3. A value computed in JavaScript is never sent to the database as an amount.
     Only the user's typed value (after `roundMoneyInput`) is.
  4. Rounding is visible and explicit (`roundMoneyInput`); nothing rounds
     silently, and there are no currency conversions.
- **Two cents conversions in `domain/money.ts`** (`toMinorUnits` moves there
  from `domain/installments.ts`, since it is no longer specific to
  installments):
  - `toMinorUnits(amount)` is strict: it reads the number's shortest decimal
    representation and throws `RangeError` for more than 2 decimals. It is for
    a single value that must already be a valid amount (a stored row, a
    validated input).
  - `sumToMinorUnits(sum)` is for a value that JavaScript computed by adding
    or subtracting 2-decimal amounts. Float noise on such a value is around
    1e-11, so `Math.round(sum * 100)` recovers the exact cents; it never throws.
    It is not for typed text (`1.005 * 100` is `100.49999999999999`), and it
    exists because aggregates are still summed with `+` until Phase 2, and
    because a check that runs on every keystroke must not throw on half-typed
    input.
- **Comparisons are made on integer cents; ratios stay floating point for
  display.** The ratio a threshold is decided on is computed from the same
  cents, so `spent = limit` gives exactly 100.
- **The payments-match check has a single rule.** `paymentsMatchAmount(assigned,
  amount)` compares both in cents through `sumToMinorUnits`, and both the
  submit validation and the warning colour in `AddTransaction` use it,
  replacing the `!==` and the `0.001` tolerance. The database check stays the
  authority.
- **`getBudgetProgress` decides `near-limit` and `exceeded` in cents**
  (`spentCents * 100 >= limitCents * threshold`), so a spend that lands exactly
  on 80% or 100% is classified correctly.
- **`getPercentChange` is exact when both periods are equal in cents** and
  computes the change from the cents otherwise. Its callers
  (`analyticsInsights.ts`, `Analytics.tsx`, `getPeriodComparison`) keep their
  `=== 0`, `> 0` and `< 0` tests: they act on the ratio, and the only source of
  noise in it is this function.
- **`AddBudget` follows the same convention as the other money forms:** visible
  rounding to 2 decimals on blur (`roundMoneyInput`) and a decimals check on
  submit.

## Implementation

Phase 1 (decided, one branch, one commit per item):

1. `domain/money.ts`: `toMinorUnits` (moved), `sumToMinorUnits` and
   `paymentsMatchAmount`; `AddTransaction` uses the latter for validation and
   for `paymentSummaryMismatch`.
2. `domain/budget.ts`: `getBudgetProgress` thresholds in cents.
3. `domain/analytics.ts`: `getPercentChange` in cents. Tests at the
   `getPeriodComparison` and `buildInsights` level, with inputs that produce
   float noise.
4. `pages/AddBudget.tsx`: visible rounding on blur (`roundMoneyInput`) and a
   decimals check on submit (`amountMaxDecimals`, `en` and `es`, `budgets`
   namespace), like `AddGoal`.
5. A migration that adds `p_amount < 10000000000` to `save_transaction`,
   raising `invalid_amount` like the other checks, so an oversized amount gets
   a clear error instead of a numeric overflow.

Phase 1 also verified the column types and stored data (see Context). No
pre-flight is needed for it.

Phase 2 (deferred, mechanical):

- Add `sumMoney`/`addMoney`/`subtractMoney` (strict `toMinorUnits` on each
  addend, one division at the end) and use them wherever amounts are summed:
  `domain/category.ts` (`sumByCategory`, `rollupByCategory`),
  `services/analyticsService.ts` (`getMonthlyStats` totals,
  `getSpendingByCategory` total, `grossSpendByBucketKey`;
  `totalDepositedToGoals` moves onto `sumMoney`), `hooks/useBudgets.ts`
  (`effectiveLimit`), `pages/Dashboard.tsx` (balance),
  `components/molecules/BudgetCard/BudgetCard.tsx` (`reimbursedAmount`),
  `domain/goal.ts` and `domain/analytics.ts` (`getSavingsRate`).
- Once the sums are exact, `sumToMinorUnits` is only needed for the checks
  above and can be reviewed.

## Consequences

- Precision-sensitive behaviour is fixed at its origin (the sums), not at each
  comparison, without changing types, components or the database.
- Ratios remain floating point and are only displayed; nothing in this ADR
  makes a percentage "exact", and it does not need to be.
- `sumToMinorUnits` rounds to the nearest cent, which is only correct for a
  sum of 2-decimal amounts. That is why it is a separate, named function from
  the strict `toMinorUnits`, and why the rule forbids using it on typed text.
- Stored data cannot break the strict helpers Phase 2 will use: the columns are
  `numeric(12,2)`, and new rows go through RPCs and CHECKs that reject more
  than 2 decimals.
- `toMinorUnits` changes module, a small import change.
- The ADR does not address currency per row. Amounts carry no currency of
  their own; the selected currency is a display label, as `domain/currency.ts`
  documents. That is a separate decision.
- **Alternatives considered (rejected):**
  - *Integer cents end to end (types, services, components,
    `formatCurrency`)*: correct, but touches about 25 source files and their
    tests and stories, and a value in cents used as if it were in units is a
    silent error. The current scale does not pay for it. It becomes the
    right choice under the triggers below.
  - *A decimal library (decimal.js, big.js)*: adds a dependency (roughly
    3 KB to 13 KB gzipped, lazy-loaded with Finora) to solve what
    `toMinorUnits` and native `BigInt` already solve. Amounts would still be
    JSON numbers at the boundary: `save_transaction` requires
    `jsonb_typeof(p -> 'amount') = 'number'`, so a string could not be sent
    without changing SQL.
  - *Moving aggregates to SQL (views or RPCs)*: exact by construction, but it
    would reimplement in plpgsql the installment expansion with
    `make_interval`, the cents allocation and the category rollup, alongside
    the JavaScript preview in `AddTransaction` that must keep matching them.
    It also loses the unit-testable pure functions ADR-001 to ADR-003 rely on,
    and the repository has no SQL test setup. Results would still reach the
    client as `number`.
  - *Reading amounts as text (`amount::text` in the select)*: exact on arrival
    but changes every type and every consumer, with the same reach as integer
    cents and no more benefit.
  - *Doing nothing beyond documenting*: defensible at this scale, but leaves
    the two inconsistent payment checks and the unrounded budget limit, and
    keeps a rule in CLAUDE.md that the code visibly does not follow.

## Revisit when

- **Move aggregates to SQL** when a view needs more than a few thousand rows
  in the browser (the 5-year trend already downloads every row in the
  window), or when a second consumer (export, mobile, an API) needs the same
  figures and would otherwise reimplement ADR-001 to ADR-003 rules.
- **Move to integer cents or a decimal type** when a currency with a
  different number of decimals is added (JPY, KWD), when multi-currency or
  conversion arrives, when amounts computed by the client (interest, tax,
  percentage of an amount, prorating) start to be persisted, or when the
  boundary must carry values beyond JavaScript's exact range.
- **Reopen this decision** if a precision bug is reported in production after
  the rule is applied, or if a column that holds money stops being
  `numeric(12,2)`.
