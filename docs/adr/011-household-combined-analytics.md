# 011. Household-combined Analytics and Dashboard: full visibility, no tagging

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

## Consequences

- **Analytics/Dashboard and the household budget can legitimately show
  different totals for the same category**, by design: the budget counts only
  tagged entries, the combined view counts everything. This ADR is the answer
  when that difference raises a question later.
- **A member sees their partner's entire spending breakdown by category**
  once combined view is on, not just the shared/household-tagged slice -
  already permitted by ADR-007's RLS, now actually exercised.
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
