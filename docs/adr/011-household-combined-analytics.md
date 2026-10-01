# 011. Household-combined Analytics and Dashboard

## Status

Accepted

Does not amend ADR-007 or ADR-010 - it documents a decision ADR-007 already
anticipated but never wrote down explicitly, and, after a bug surfaced in
manual validation, settles on **reusing ADR-010's attribution rule directly**
rather than inventing a second one.

## Context

ADR-007's own Context section, written before any household feature shipped,
already named the destination: "both want to see the other's transactions in
full detail - not just combined totals - so that later work (a shared/split
expense, **a combined Analytics view**) has something real to sum and
display." That sentence was never turned into a decision of its own - PR1-PR8
built the household foundations, the split (ADR-009), the household-expense
tag and household budget (ADR-010), but nothing yet reads `transactions` or
`goal_transfers` for *both* members outside a single budget's category.

This ADR went through two corrections before landing, both from the same
root cause: treating "combined" as one single rule for every number on the
screen, instead of recognizing that Analytics mixes two genuinely different
kinds of figures.

1. **A blind category merge hides who spent what.** The first
   implementation summed every category total across both members into one
   fused number - technically "full visibility," but it could say "the
   household spent $800 on Travel" and nothing more, not whose. A household
   overview that cannot answer that question defeats its own purpose.
2. **Attributing a split by `user_id` instead of `transaction_shares` is
   wrong, not just blind.** The fix for (1) widened `getSpendingByCategory`
   et al. to run once per member, filtered to that member's own `user_id`.
   That works for an ordinary expense, but a Case A split (ADR-009) lives in
   **one row with one `user_id`** - "rent $14,700, $5,200 mine / $9,500 my
   partner's" is one transaction the recorder owns, not two. Filtering by
   `user_id` gave the full $14,700 to whoever recorded it and $0 to the
   other member, confirmed with real data in manual validation. The
   household budget (PR8, ADR-010) had already solved exactly this problem -
   `getHouseholdAttributedAmount` reads `transaction_shares.amount` for Case
   A instead of the row's own `user_id` - and PR9 should have reused it
   instead of building a second, narrower implementation that didn't.

Once (2) was fixed by reusing ADR-010's attribution, a further question
became unavoidable: if a category's breakdown is now attributed the same way
a household budget is, should it also follow the household budget's
**tagged-only** rule (only `is_shared`/`is_household_expense` rows count),
rather than attributing every transaction including untagged ones? The
answer is yes, and for a simplifying reason, not just a stylistic one: once
attribution is shared with Budgets, there is no longer a reason to maintain
a second, parallel behavior for the one case (untagged spend) where they'd
differ.

## Decision

- **Two kinds of numbers in Analytics, two different rules - not one
  "combined" definition for the whole screen:**
  - **Aggregated totals - the top summary (income, expenses, savings rate,
    saved to goals) and the comparison's headline total** - stay **full
    visibility**: every transaction and goal transfer of both members,
    tagged or not, summed together via a plain `.in('user_id', [...])`
    widening (`getMonthlyStats`, unchanged). This is exactly what ADR-007's
    RLS already permits reading, and it was never the buggy part - a blind
    sum of both members' full rows already gives the right total regardless
    of how a Case A split later gets attributed between them.
  - **Everything broken out by category - Spending by category, Spending
    over time (the trend chart), the comparison's per-category table, and
    Top spending categories** - uses **exactly the household budget's rule
    (ADR-010): only `is_shared` (attributed by each member's own
    `transaction_shares.amount`) or `is_household_expense` (attributed in
    full to whoever recorded it) counts, split into two per-member columns.
    An untagged personal expense contributes to neither column, even though
    it is part of the combined total above it on the same screen.
- **One shared attribution primitive, not two.** `getHouseholdAttributedAmount`
  (`domain/transaction.ts`) is unchanged from PR8 and untouched by this ADR.
  `transactionsService.getHouseholdAttributedEntries` - the query
  (`is_shared.eq.true,is_household_expense.eq.true`) plus the attribution
  step - is extracted once and reused by both the household budget
  (`getHouseholdContributionsByCategory`, a thin wrapper kept for its
  existing name/shape) and Analytics' `getHouseholdSpendingByCategory` /
  `getHouseholdTrendData`. There is exactly one implementation of "how does
  a shared/household-tagged transaction split between two people," so
  Budgets and Analytics cannot drift apart on it again.
- **A personal/"Mine" view must remain available**, not just the combined
  one - matching the precedent `Transactions`' Mine/Household tabs already
  set (PR5).
- **Presentation: two full-width panels, stacked, not a selector.** Spending
  by category, Top spending categories and the comparison table each render
  two labeled panels ("Tú" / the partner's name) simultaneously, the same
  data `Transactions`' Mine/Household tabs already split but shown at once
  instead of behind a toggle, because this is a monthly report read at a
  glance, not a navigable list. They stack one above the other rather than
  side by side - a two-up grid tried first left each panel too narrow once
  an icon, a name, an amount and (for Spending by category) a subcategory
  breakdown all had to fit in it, confirmed visually as a name/amount
  overlap bug. A category with subcategories (e.g. Housing) gets a
  collapsible breakdown identical to a budget's (`BudgetCardBreakdown`,
  reused as-is - the same component, fed `buildCategoryBreakdown`'s output
  and the row's own amount as its `limit`) - only for Spending by category,
  not Top spending categories, which stays a plain glance-able list.
- **The trend chart is a stacked bar chart, not a line**, each bar one
  bucket (day/month/year), its two segments each member's attributed spend
  for that bucket, with a legend. Follows market precedent (Monarch Money's
  "Trend Bars"). Reuses the app's existing `primary`/`primarydark` tokens
  for both the bar segments and the two category columns - no new color
  tokens.
- **Per-member insights, one combined total insight.** The automatically
  generated sentences (`analyticsInsights.ts`) are built from the
  per-category comparison data, so they follow it: `buildCategoryInsights`
  phrases one in 2nd person for the caller ("Tú gastaste 18% más en
  Food…") or 3rd person with the member's name for the partner ("Dana gastó
  12% menos en Rent…") - different sentences, not one template with a
  swapped-in name, since Spanish conjugates by grammatical person.
  `buildHouseholdTotalInsight` phrases the one combined total impersonally
  ("el hogar gastó…"), since the headline total has no single person to
  attribute it to. Capped at the same `TOP_CHANGES_LIMIT = 2` per member the
  Mine view already uses (so up to 2+2+1 = 5 lines) - confirmed against the
  rendered result rather than fixed smaller in advance, per the original
  plan.

## Consequences

- **The top summary and the category breakdown can legitimately disagree on
  the same screen, by design**: the top "Total spent" includes every
  expense, the category columns below it only the tagged ones. A household
  with little tagged spending will see a combined total much larger than
  what its two columns add up to. This ADR is the answer when that
  difference raises a question later - it mirrors the same gap ADR-010
  already accepts between a household budget and the household's overall
  spending.
- **Analytics and the household budget can no longer drift apart on
  attribution**, because they share one implementation
  (`getHouseholdAttributedEntries`) instead of two. A future bug in Case
  A/B attribution gets fixed once, for both.
- **A member sees their partner's tagged spending broken down by category**,
  not the partner's entire personal spending - narrower than ADR-007's RLS
  technically permits, deliberately, for the reason above.
- **Without an active, accepted household, nothing changes** - every service
  keeps defaulting to the caller's own `user_id` alone, identical to today.
- **Alternatives considered (rejected):**
  - *Reusing ADR-010's tagged-only rule for the top summary too*: would make
    the household's own overview exclude most of its real spending (nobody
    tags their coffee), defeating the point of a combined financial picture
    - this is why the top summary alone stays full visibility.
  - *Blind-merging the category breakdown into one number per category (the
    first implementation)*: answers "how much" but not "whose," which is
    precisely the information a shared financial overview needs to be
    useful rather than just aggregate.
  - *Attributing a household-tagged category breakdown by `user_id` instead
    of `transaction_shares` (the second implementation)*: silently wrong for
    any Case A split, confirmed with real data (a $14,700 rent split showing
    $14,700/$0 instead of $5,200/$9,500) - this is the bug this ADR's final
    version fixes.
  - *A second, Analytics-specific attribution function instead of reusing
    PR8's*: would reintroduce exactly the risk that caused the bug - two
    implementations of the same rule that can silently diverge.
  - *A dropdown/selector for the category breakdown instead of two panels*:
    rejected for the same reason the Mine/Household tabs stay a toggle
    elsewhere but not here - a monthly report is read once, not navigated.
  - *A side-by-side two-column grid for the two panels (tried first)*: CSS
    confirmed correct (`sm:grid-cols-2` did produce two columns at desktop
    widths), but each column ended up too narrow for an icon, a name, an
    amount and a subcategory breakdown to coexist legibly - visually
    confirmed as a name/amount overlap, not a CSS bug to patch further.
    Stacking full-width fixes the room problem directly instead of chasing
    truncation/wrapping fixes in an inherently too-narrow column.
  - *Keeping the trend chart as a line, one line per member*: two
    overlapping lines are harder to read as "what did we spend total" than
    one stacked bar whose segments show composition.
  - *A new component for the subcategory breakdown instead of reusing
    `BudgetCardBreakdown`*: unnecessary duplication for visually and
    functionally identical behavior - a parent category's amount stands in
    for a budget's limit with no change to the component itself.
