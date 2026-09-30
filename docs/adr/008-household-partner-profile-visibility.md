# 008. Household partner profile visibility

## Status

Accepted

Amends [ADR-007](./007-household-foundations.md): narrows what "mutual
visibility" means when it reaches `profiles` instead of financial data. Every
other decision in ADR-007 is unchanged.

## Context

ADR-007 gave accepted household members mutual read access to each other's
`transactions`, `transaction_payments`, `budgets`, `goals` and
`goal_transfers`. Building the invitation and membership UI (PR2) surfaced a
gap ADR-007 never addressed: to show "invited by \[name\]" on the pending
invite banner, or list who is in a household in Settings, the client needs
*some* identity for the other person - and `profiles` still carries the
RLS it always had (`auth.uid() = user_id`, self only).

Widening `profiles` the same way as ADR-007's five tables would work, but
`profiles` holds `phone`, `date_of_birth`, `nationality`, `currency`,
`theme` and `language` alongside `first_name`/`last_name`/`avatar_url`. The
product ask ("visibilidad total mutua") was scoped explicitly to financial
transaction data; nothing asked for a household member to see their
partner's phone number or date of birth. Treating profile data as included
by extension would be a silent scope increase, not a continuation of
ADR-007.

## Decision

- **A dedicated function, not a wider policy.** `get_household_partner()` is
  a `security definer` function, not a change to `profiles`'s RLS. It
  returns exactly `user_id, first_name, last_name, avatar_url` for the other
  member of the caller's household - never `phone`, `date_of_birth`,
  `nationality`, `currency`, `theme`, `language` or the email address
  (already excluded from the client by design, ADR-007). `profiles`'s own
  policies are untouched.
- **Not gated on `status = 'accepted'`.** The function joins the caller's
  `household_members` row to the other row of the same `household_id`,
  regardless of either side's status, then joins that user's `profiles` row.
  A household never holds more than its two founding rows, and
  `decline_household_invite`/`leave_household` always delete both together
  (ADR-007), so this can never surface a partner from a dissolved or
  half-formed relationship - only the two real cases that need it:
  - A pending invitee (their own row is `'pending'`) sees the inviter's name
    for the banner - the inviter's row is always `'accepted'` by
    construction.
  - An accepted member sees the name of a partner who has not accepted yet,
    for the "invitation sent" state in Settings.
- **Callable by any authenticated user, safe by its own join.** Like the
  other household functions, it is granted to `authenticated`. A user with
  no household row simply gets zero rows back - the join has nothing to
  match - so no extra "am I in a household" check is needed inside it.

## Implementation

- Migration `supabase/migrations/20260930090000_household_partner_profile.sql`:
  the function, `revoke`/`grant` following the same pattern as every other
  function in `docs/adr/007-household-foundations.md`.
- `supabase/tests/household_partner_profile_rls.sql`: run against the live
  database under the `authenticated` role, the same harness as
  `household_rls.sql` - a user with no household gets nothing; a pending
  invitee sees the inviter; an accepted inviter sees the still-pending
  invitee; acceptance does not change either view; an unrelated third user
  sees neither.
- `services/householdsService.ts` / `domain/household.ts` (PR2): typed
  wrapper and `HouseholdPartner` type for the four fields this function
  returns - nothing more.

## Consequences

- **`profiles` visibility stays exactly as narrow as it was before Finora
  had households.** Only name and avatar cross the household boundary;
  everything else in `profiles` remains private to its owner.
- **One more function to keep in sync if `profiles` gains display fields
  later** (e.g. a second avatar variant): `get_household_partner()`'s column
  list would need a deliberate decision to include it, which is the point -
  nothing crosses by default.
- **Alternatives considered (rejected):**
  - *Widening `profiles`'s SELECT policy with `household_member_ids()`,
    exactly like ADR-007's five tables*: simpler (one pattern, no new
    function), but exposes `phone`, `date_of_birth` and `nationality` to a
    household partner with no product request for it.
  - *Storing the partner's display name directly on `household_members`
    at invite time*: goes stale the moment the partner edits their profile,
    and reintroduces a cache-consistency problem ADR-004 deliberately avoided
    for Goal balances.
  - *Gating the function on `status = 'accepted'` on the caller's side*: the
    literal first version of this decision - it left the pending invitee
    unable to see who invited them, which breaks the banner this function
    exists for.
