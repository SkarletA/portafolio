# 002. Gross category spend and effective budget limit (reimbursements)

## Status

Accepted

## Context

ADR-001 defined a category's "spent" as `sum(expense amounts) - sum(reimbursement
amounts)` for that category's rollup scope, clamped to a minimum of 0 once after
summing the whole scope. That rule was correct in isolation, but a later feature —
the per-subcategory breakdown shown under each budget card — exposed a real,
user-confusing interaction between it and the reimbursement rule:

- The breakdown shows each subcategory's own raw amount (`getRawNetSpendByCategory`),
  unclamped.
- The parent budget's headline "spent" figure is the rolled-up, *clamped* net
  (`getNetSpendByCategory`).

Because the floor is applied once at the rollup total but never at the subcategory
level, a large enough reimbursement can drive the parent's displayed "spent" toward
(or to) 0 while the subcategories underneath it still show real, positive spend that
no longer reconciles with the headline number. Concretely: a Food budget with a
$2,000 limit, $3,625 in real subcategory expenses, and a $2,000 reimbursement
correctly nets to $1,625 spent — but a different mix of the same inputs can floor the
parent to $0 while the breakdown still lists hundreds or thousands of dollars of real
spend underneath it. That is not a display bug; it is the direct, intended
consequence of ADR-001's "clamp once, net against reimbursements" rule once a
sub-total view exists that ADR-001 didn't anticipate.

More importantly, netting reimbursements into "spent" models the wrong mental model.
A reimbursement is money coming back — it should let the user spend *more* against
their limit this period, not quietly shrink the number that represents what they
already spent (and potentially hide real spend behind a floor). A $2,000 Food budget
that receives a $2,000 reimbursement should feel like $4,000 of usable room, not like
$0 was ever spent.

This ADR **supersedes ADR-001's rule for what "spent" means** (the net-and-floor
calculation). It does **not** change:

- ADR-001's rollup scope mechanism (`getCategoryIdsForRollup`: a parent's scope is
  itself plus its direct children combined into one number; a subcategory's scope is
  itself alone) — this still determines *which* categories get summed together.
- The database-enforced invariant that a `reimbursement` transaction always has a
  `category_id` and is never treated as `income`.

## Decision

- **`spent` (gross)** = `sum(expense amounts)` only, for a category's rollup scope.
  Reimbursements no longer subtract from it. It is never floored at 0 — a sum of
  non-negative expense amounts cannot be negative, so the floor that ADR-001
  required (and the "clamp once at the rollup, never per child" subtlety that
  motivated it) is no longer needed for this figure at all. This is the figure used
  for:
  - a budget's category-level `spent` (`useBudgets`),
  - Analytics' `totalSpent` (`analyticsService.getMonthlyStats`),
  - and, because both of the above already read from the same shared rollup map
    (`transactionsService.getExpensesByCategory().totals`), also Analytics'
    "Spending by category" (`getSpendingByCategory`) and period-over-period
    comparisons (`getPeriodComparison`). This is intentional, not incidental scope
    creep: ADR-001's core guarantee was that Budgets and Analytics can never disagree
    about what a category's spend means because they share one function. Changing
    that function's definition without changing every caller would silently break
    that guarantee and reintroduce a mismatch of the same shape as the bug that
    prompted this ADR.
  - The "Spending over time" trend chart (`getDailySpending`, `getTrendData` in
    `analyticsService.ts`) currently buckets by date using the same
    expense-minus-reimbursement-then-floor logic. That reasoning still applies and
    now points the other way — these bucket functions also switch to summing
    expense amounts only (and drop their per-bucket floor), or the trend line would
    stop matching the new gross "Total spent" and reintroduce exactly the
    inconsistency ADR-001 fixed.

- **`effectiveLimit`** = `monthly_limit + sum(reimbursement amounts)` for the same
  period and the same rollup scope as `spent`. A reimbursement widens how much a
  budget can absorb this period rather than shrinking what's shown as already spent.
  This is a **budget-only** concept — Analytics' `totalSpent` has no "limit" to
  widen, so reimbursements don't feed into it there.

- **`percentage`/`status`/`remaining`** for a budget are computed against
  `effectiveLimit`, not the raw `monthly_limit`. `monthly_limit` remains stored and
  displayed as the budget's nominal, user-set limit; `effectiveLimit` is the derived
  figure actually used for progress math and is also surfaced in the UI wherever
  `monthly_limit` currently is (see Consequences).

- **Savings rate keeps netting reimbursements internally, decoupled from the
  displayed "Total spent."** "Savings rate" answers a different question than "Total
  spent" — it's meant to tell the user how much of their income they actually kept
  this period, not how much they charged as expenses. A reimbursement is real cash
  back in the user's pocket; ignoring it here would tell the user they saved less
  than they truly did whenever a refund occurs, which is a worse and less honest
  answer to the specific question "how much did I keep." It is fine, and expected,
  for two differently-purposed metrics on the same screen to use different
  definitions of "spend" as long as each is internally consistent and clearly its
  own concept — the problem this ADR fixes is two views of the *same* concept
  (category spend) disagreeing, not different concepts computing differently.
  - Computation: `getMonthlyStats` already fetches every `{ type, amount }` row for
    the range. It computes `totalSpent` (gross expense sum, for display) and a
    separate `totalReimbursed` (sum of `reimbursement` amounts, not displayed) from
    those same rows, then derives `netSpentForSavings = totalSpent - totalReimbursed`
    and calls `getSavingsRate(totalIncome, netSpentForSavings)`. `getSavingsRate`'s
    own signature and formula (`domain/analytics.ts`) do not change — only what
    `getMonthlyStats` passes into it changes, from the old clamped/displayed net
    value to a value computed solely for this one call and never shown to the user.
  - `netSpentForSavings` is **not** floored at 0. If reimbursements in a period
    exceed that period's expenses, `netSpentForSavings` goes negative and
    `savingsRate` can exceed 100%. This is treated as correct: it means the user's
    cash position grew by more than their income this period due to a windfall,
    which a period-based cash-flow metric should reflect rather than hide behind an
    artificial cap.

## Implementation

- `domain/category.ts`: `getNetSpendByCategory`/`getRawNetSpendByCategory` are
  replaced by `getGrossSpendByCategory`/`getRawGrossSpendByCategory` (sum `expense`
  amounts only, per category and rolled up via the existing `getCategoryIdsForRollup`
  scope), with no `Math.max` floor. A parallel rollup for `reimbursement` amounts
  only is added as `getReimbursementsByCategory` (same rollup mechanism, different
  type filter) to support `effectiveLimit`. All are pure functions over plain
  arrays, independent of Supabase, per the existing pattern.
- `services/transactionsService.ts`: `getExpensesByCategory(range)` returns a third
  map alongside the existing `totals` (now gross) and `raw` (now gross, per-category
  unrolled): `reimbursements` (rolled-up reimbursement sum per category scope), so
  `useBudgets` can derive `effectiveLimit` without a second query.
- `hooks/useBudgets.ts`: for each budget, `effectiveLimit = budget.monthly_limit +
  (reimbursementsByCategory[budget.category_id] ?? 0)`; `getBudgetProgress` is
  called with `effectiveLimit` instead of `budget.monthly_limit`. `BudgetWithProgress`
  gains an `effectiveLimit` field alongside the existing `monthly_limit`, `spent`,
  `percentage`, `status`, and `breakdown`, so the UI can show both numbers.
- `domain/budget.ts`: `getBudgetProgress(monthlyLimit, spent)` needs no signature or
  logic change — it already just takes "a limit" and "an amount spent." Its
  `monthlyLimit <= 0` special case now effectively becomes an `effectiveLimit <= 0`
  case, purely because of what the caller now passes in.
- `services/analyticsService.ts`: `getMonthlyStats` drops the
  `totals.totalSpent = Math.max(totals.totalSpent, 0)` line and the `-= amount`
  branch for `reimbursement` rows in its reduce (reimbursements no longer touch
  `totalSpent`); it separately accumulates `totalReimbursed` from the same rows and
  uses it only to compute `savingsRate`. The shared bucketing helper used by
  `getDailySpending`/`getTrendData` is changed the same way — sum `expense` amounts
  per bucket only, drop the per-bucket floor.
- UI: `BudgetCard.tsx` and `BudgetCardBreakdown.tsx` switch from `monthly_limit` to
  `effectiveLimit` for both the headline fraction and the mini per-subcategory
  progress bars, and `BudgetCard` indicates when `effectiveLimit` differs from
  `monthly_limit` (e.g. "$1,850 / $4,000 (includes $2,000 in reimbursements)").

## Consequences

- **Simpler in one respect:** ADR-001's most subtle rule — clamp once at the rollup
  scope, never per child, so a subcategory's reimbursements can offset a sibling's
  expenses at the parent level — no longer applies to `spent` at all, because a pure
  sum of expense amounts is associative and always non-negative regardless of
  grouping order. There is nothing left to get wrong about clamp ordering for this
  figure.
- **New reconciliation surface:** `effectiveLimit` introduces a second budget-scoped
  rollup (reimbursements) that must stay in lock-step with the expense rollup used
  for `spent`, or the percentage/status math and the breakdown will disagree the
  same way the bug in this ADR's Context did. Both are derived from the same
  `getExpensesByCategory` call per budget, not recomputed independently.
- **UI must change**, not just the calculation: every place that divides by or
  displays `monthly_limit` (`BudgetCard`, `BudgetCardBreakdown`'s mini bars) must
  switch to `effectiveLimit`, and surface that the limit was widened by
  reimbursements — otherwise the fix is invisible or, worse, `BudgetCard` and
  `BudgetCardBreakdown` end up using two different denominators, reintroducing a
  mismatch of the same shape as this ADR's motivating bug.
- **Analytics' "Spending over time" chart must move in lockstep with "Total spent,"**
  as spelled out above — required by ADR-001's own already-established invariant;
  skipping it would quietly break that invariant again.
- **Savings rate and "Total spent" now intentionally diverge in what they count**
  (gross vs. net of reimbursements). This must be understood as two distinct,
  independently-correct metrics, not as an inconsistency — but it's worth flagging
  explicitly since it's a deliberate exception to "one number, one meaning," unlike
  everywhere else in this ADR.
- **Edge case — reimbursement with no matching expense this period:** a
  reimbursement dated in the current period, refunding a purchase made in a prior
  period, still fully widens `effectiveLimit` this period even though this period
  recorded no matching expense. This is not new behavior (ADR-001's rollup already
  only looks at transaction dates within the queried range, independent of any
  original expense's date) but it's more visible now, since it inflates a limit
  rather than quietly shrinking a spend figure. No change is proposed to prevent it;
  it is accepted as consistent with how the app already scopes all monthly figures
  by date range.
- **Edge case — budget with no reimbursements at all:** `effectiveLimit` reduces to
  `monthly_limit + 0`, i.e. identical to today. The UI's "includes $X
  reimbursements" annotation only renders when `effectiveLimit !== monthly_limit`,
  so the common case is visually unchanged.
- **Edge case — a `monthly_limit` of 0 combined with a reimbursement:**
  `getBudgetProgress`'s existing `<= 0` special case is keyed off whatever value
  it's given. Passing `effectiveLimit` means a nominally $0 budget that has an
  unrelated reimbursement posted to its category this period will no longer trip
  that special case (it'll have a positive `effectiveLimit` and go through normal
  percentage math instead). This is a direct, intended consequence of "the limit is
  whatever's actually usable this period," not a regression, but it changes
  observable behavior for that specific combination and is covered by a
  `domain/budget.test.ts` case.
- **Negative `effectiveLimit` is not possible** under this model: `monthly_limit` is
  set by the user at budget-creation time and reimbursement sums are always
  non-negative (amounts are stored as positive magnitudes; direction comes from
  `type`), so `effectiveLimit` can only be less than `monthly_limit` if
  `monthly_limit` itself were already negative, which is outside this ADR's scope
  (a pre-existing data-integrity assumption, not something this change introduces or
  needs to guard against).
