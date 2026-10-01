# 011. Household-combined Analytics and Dashboard

## Status

Accepted

Does not amend ADR-007 or ADR-010 - it documents a decision ADR-007 already
anticipated but never wrote down explicitly, and draws the line between it and
ADR-010's narrower rule now that both exist side by side.

## Context

ADR-007's own Context section, written before any household feature shipped,
already named the destination: "both want to see the other's transactions in
full detail - not just combined totals - so that later work (a shared/split
expense, **a combined Analytics view**) has something real to sum and
display." That sentence was never turned into a decision of its own - PR1-PR8
built the household foundations, the split (ADR-009), the household-expense
tag and household budget (ADR-010), but nothing yet reads `transactions` or
`goal_transfers` for *both* members outside a single budget's category.

Now that ADR-010 exists, there are two plausible readings of "combined" for
Analytics/Dashboard, and they are not the same thing:

- **Full visibility** (what ADR-007 already grants at the RLS level): every
  transaction and goal transfer of both members, tagged or not, summed
  together - the household's whole financial picture.
- **Tagged-only** (ADR-010's rule): only what a member explicitly marked as
  shared (Case A) or household (Case B) counts as "of the household"; an
  ordinary personal expense never does, even on a household budget.

Left undocumented, a future reader (or a future PR) has no way to tell which
one Analytics/Dashboard should follow, or why it might legitimately differ
from the household budget's rule next to it.

A first implementation of "full visibility" blind-merged every number,
including the category breakdown, into one fused total per category.
Reviewing it surfaced a real problem, not a preference: a category total that
mixes both members' spending with no attribution hides exactly the thing a
household overview exists to show - "whose travel spending is this?" became
unanswerable from the screen itself, undermining the point of combining in
the first place. That is the second decision this ADR now also covers.

## Decision

- **"Combined" in Analytics/Dashboard means full visibility: every expense,
  income, reimbursement and goal deposit of both household members, tagged or
  not.** No transaction needs `is_shared` or `is_household_expense` to count
  once a household is active - this is exactly what ADR-007's RLS
  (`household_member_ids()`) already permits reading, extended for the first
  time to a consumer that sums rather than lists rows individually.
- **This is deliberately different from ADR-010's household budget**, and the
  difference is not an inconsistency to resolve later: a household budget is
  a specific, bounded commitment the two members opted into for one category
  ("cubrimos el total del alquiler entre los dos") - tagging is how each
  transaction declares "this counts toward that commitment." Analytics and
  Dashboard answer a different question - "what does this household's money
  look like overall" - where requiring every row to be individually tagged
  would be both wrong (most of a household's spending is never shared or
  household-tagged, it is just each member's own, and still real household
  spending) and impractical (nobody tags their coffee).
- **No new tables, columns or RPCs.** This is a read-composition decision
  only: the services behind Analytics/Dashboard widen their `user_id` filter
  from the caller alone to every accepted household member, the same
  `householdMemberIds?` parameter shape `getTransactions` (PR5) and
  `getBudgets` (PR8) already use. `getGrossSpendByCategory` and the other pure
  domain functions stay exactly as unaware of households as ADR-010 already
  established.
- **A personal/"Mine" view must remain available**, not just the combined
  one - matching the precedent `Transactions`' Mine/Household tabs already set
  (PR5), rather than silently replacing a member's individual numbers with
  the household's.

### Presentation within the Household view: aggregated-over-time stays fused, broken-out-by-category splits per member

Not every number in Analytics is the same *kind* of combined. Two kinds exist,
and they get different treatment:

- **Aggregated over time** - the top summary (total income, total spent,
  savings rate), the trend chart, and the period comparison's headline total
  ("you spent $X this period vs $Y the previous one") - stays one fused
  number, exactly as the Decision above states. There is nothing to attribute:
  a month's total income is a single fact about the household.
- **Broken out by category** - Spending by category, Top categories, and the
  period comparison's per-category table - is presented as **two columns side
  by side, one per member ("Tú" / the partner's name)**, each with its own
  total and its own category list, instead of one blind-merged row per
  category. This is the same data `Transactions`' Mine/Household tabs already
  split, shown simultaneously instead of behind a selector, because this is a
  monthly report meant to be read at a glance - not a navigable list, which is
  what the tabs are for elsewhere. The automatically generated insight
  sentences (`analyticsInsights.ts`), since they are derived from this same
  per-category comparison data, are generated per member too ("Tú gastaste
  18% más en Food…", "`<partner>` gastó 12% menos en Rent…"), capped at 1-2
  per member if combining both members' insights produces too much text - the
  exact cap is a visual call, decided by looking at the rendered result rather
  than fixed in advance here.
- **The trend chart becomes a stacked bar chart, not a line.** Each bar is one
  bucket (day/month/year, the same granularity `getTrendData` already
  produces); its height is the combined spend for that bucket (still one
  fused number, per the rule above), divided into one segment per member
  within the bar, with a legend naming which color is which. This follows
  market precedent (Monarch Money's "Trend Bars," the default for a household
  cash-flow view) and resolves the same tension as the category columns: the
  total stays legible as a single combined shape, while who contributed what
  to it is visible without a second chart. Reuses the app's existing
  `primary`/`primarydark` tokens for the two members' segments and for the
  two category columns, rather than introducing new color tokens.

## Consequences

- **Analytics/Dashboard and the household budget can legitimately show
  different totals for the same category**, by design: the budget counts only
  tagged entries, the combined view counts everything. This ADR is the answer
  when that difference raises a question later.
- **A member sees their partner's entire spending breakdown by category**
  once combined view is on, not just the shared/household-tagged slice -
  already permitted by ADR-007's RLS, now actually exercised. The two-column
  presentation makes that explicit rather than hiding it inside a merged
  number - a member always knows which total is whose.
- **The top summary (income/expense/savings rate) and the category breakdown
  can read as "combined" in different senses on the same screen** - the
  former is a single fused figure, the latter is openly split per member.
  This ADR is also the answer when that distinction itself raises a question.
- **Without an active, accepted household, nothing changes** - every service
  keeps defaulting to the caller's own `user_id` alone, identical to today.
- **Alternatives considered (rejected):**
  - *Reusing ADR-010's tagged-only rule for Analytics/Dashboard too*: would
    make the household's own overview exclude most of its real spending,
    defeating the point of a combined financial picture.
  - *Leaving the choice undocumented and deciding it implicitly in the
    implementation PR*: is exactly what left ADR-007's own stated intent
    unresolved for three PRs; this ADR exists so the next reader does not have
    to reconstruct the reasoning from a diff.
  - *Blind-merging the category breakdown into one number per category
    (the first implementation)*: technically simpler, but answers a worse
    question - it can say "the household spent $800 on Travel" but not "whose
    $800," which is precisely the information a shared financial overview
    needs to be useful rather than just aggregate.
  - *A dropdown/selector for the category breakdown instead of two columns*:
    rejected for the same reason the Mine/Household tabs stay a toggle
    elsewhere but not here - a monthly report is read once, side by side,
    not navigated back and forth.
  - *Keeping the trend chart as a line, one line per member*: two overlapping
    lines are harder to read as "what did we spend total" than one stacked
    bar whose segments show composition - the bar keeps the combined shape
    primary and the per-member breakdown secondary, matching how the rest of
    this view treats aggregated-over-time data.
