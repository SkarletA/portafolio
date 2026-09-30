# 007. Household foundations: membership and mutual read visibility

## Status

Accepted

Does not amend ADR-001 to ADR-006: every money rule they define (net category
spend, gross spend, installments, savings funding, money arithmetic,
reimbursement links) is unchanged for a user acting alone. This ADR only adds
who else may *read* a user's rows; it changes no figure and no write path.

## Context

Finora is built around a single assumption: every row of `transactions`,
`transaction_payments`, `budgets`, `goals` and `goal_transfers` belongs to one
`user_id`, and RLS enforces that no one else can see or touch it.

The product now needs two people (a couple/household) to use Finora together:
each keeps their own account, salary and transactions, but both want to see
the other's transactions in full detail - not just combined totals - so that
later work (a shared/split expense, a combined Analytics view) has something
real to sum and display. That is a visibility change, not a data-model change
for money itself: nothing about how a transaction, budget or goal is computed
is different for a member of a household versus someone using Finora alone.

This ADR covers only that foundation: the `household` entity, how two users
become linked, and the RLS change that gives them mutual read access. Sharing
the accounting of one expense between two people (the "split" feature) is
deliberately out of scope here and follows in its own ADR once this is in
place, the same staged approach ADR-006 used (data model and RLS first,
no visible change, UI in a later PR).

## Decision

- **`households` and `household_members`.** A household is a bare container
  (`id`, `created_by`, `created_at`); `household_members` links a user to one
  with a `status` of `'pending'` or `'accepted'`, who invited them
  (`invited_by`), and when they accepted. A partial unique index on
  `household_members(user_id) where status in ('pending','accepted')` means a
  user can be in at most one pending-or-accepted relationship at a time -
  the mechanism, not a documented rule to remember to check.
- **Exactly two people, enforced by construction.** `invite_household_member`
  refuses when either the inviter or the invitee already has a row (any
  status), so a household can never grow past its founding two rows; no
  separate member-count check is needed anywhere.
- **Invitation is by email, resolved server-side.** The client never sees or
  stores another user's email; `invite_household_member(p_email)` looks it up
  in `auth.users` inside a `security definer` function and stores only the
  resolved `user_id`. An email with no account raises `user_not_found` - this
  app does not invite someone who has not signed up. This is a deliberate v1
  restriction, not an oversight.
- **Declining or leaving dissolves the household**, rather than leaving one
  member as its sole accepted row. Without this, that member's own row would
  keep matching the partial unique index and `already_in_household` would
  permanently block them from inviting anyone else. Both
  `decline_household_invite` and `leave_household` delete every
  `household_members` row for the household and the `households` row itself,
  freeing both people to start over.
- **Visibility, not ownership.** RLS gains one new SELECT-only predicate,
  applied identically to `transactions`, `transaction_payments`, `budgets`,
  `goals` and `goal_transfers`: a row is readable by any accepted member of
  the same household as its owner, via a `household_member_ids()` helper.
  INSERT/UPDATE/DELETE are untouched - still `auth.uid() = user_id` only. No
  one can write a row under someone else's `user_id`, ever; forming a
  household only widens who may read, never who may write.
- **Existing single-owner policies did not separate SELECT from the rest.**
  `transactions`, `transaction_payments`, `budgets` and `goals` each had one
  `FOR ALL` policy with `USING = WITH CHECK = auth.uid() = user_id`. Widening
  that single policy's `USING` would have widened DELETE too (DELETE has no
  `WITH CHECK`), letting a member delete their partner's rows. Each `FOR ALL`
  policy is replaced with four - SELECT widened to the household,
  INSERT/UPDATE/DELETE left exactly as they were - rather than touched in
  place. `goal_transfers` already had separate policies per command, so only
  its SELECT policy is rewritten.
- **`household_member_ids()` always includes the caller.** It unions the
  household's other accepted members with `auth.uid()` unconditionally, so a
  user with no household, or with only a pending invitation (sent or
  received), keeps seeing exactly their own rows - identical to today's
  behavior. This is what makes the RLS change safe to ship with no UI: no
  existing screen's query changes shape, because every service already adds
  its own explicit `user_id` filter on top of RLS (double enforcement, already
  in place) - forming a household changes nothing about what those screens
  return until a future screen deliberately queries more than one `user_id`.
- **`current_household_id()`** is a second `security definer` helper (a
  member's own accepted household, or null) used both by
  `household_member_ids()` and by the `households`/`household_members` SELECT
  policies themselves, so a user can read their own household row and every
  membership row of it, plus their own membership row even before it is
  accepted (needed for a pending-invitation banner).

## Implementation

- Migration `supabase/migrations/20260929120000_household_foundations.sql`:
  `households`, `household_members`, the two helper functions, the four RPCs
  (`invite_household_member`, `accept_household_invite`,
  `decline_household_invite`, `leave_household`), and the policy split on
  `transactions`, `transaction_payments`, `budgets`, `goals`,
  `goal_transfers`. Verified against the live database's `pg_policies` first
  (the base RLS predates the migrations folder, as with ADR-006's
  `pg_constraint` check), so the `drop policy` statements target the real
  names instead of assuming them; none use `if exists`, so a mismatch aborts
  the migration rather than silently doing nothing.
- No data pre-flight needed: every new table and column is additive, and the
  RLS split is behavior-preserving for a user with no household (see above).
- Nothing in `src/apps/finora` changes in this PR - no UI, no service calls
  the new RPCs yet. `database.types.ts` is regenerated to add `households` and
  `household_members` so later PRs can build on accurate types.

## Consequences

- **No visible behavior change until a UI calls these RPCs.** Every existing
  screen still shows exactly one user's data, because the client-side
  `user_id` filters are untouched.
- **A household caps at two people.** Revisiting this (more than two members)
  would need to relax `invite_household_member`'s refusal and reconsider
  whether "mutual total visibility" still makes sense at three or more.
- **Declining/leaving is destructive to the relationship, not to money.** No
  `transactions`, `budgets` or `goals` row is ever touched by any household
  RPC; only `households`/`household_members` rows are created or removed.
- **Inviting requires the other person to already have an account.** A
  household cannot be started by inviting someone by email who has not signed
  up; product must decide separately if that is ever needed.
- **RLS now depends on two `security definer` helper functions.** Both are
  `stable`, read only `household_members`, and are granted `EXECUTE` only to
  `authenticated` (not `anon`), matching how every other privileged function
  in this schema is scoped.
- **Alternatives considered (rejected):**
  - *Widening the existing `FOR ALL` policies' `USING` clause in place*:
    silently widens DELETE along with SELECT, since `FOR ALL` shares one
    `USING` across SELECT/UPDATE/DELETE and DELETE has no `WITH CHECK` to
    catch it.
  - *Modeling a household as an implicit pair on `user_id` (e.g. a
    `partner_id` column on a profile) instead of a `households` table*:
    cheaper for exactly two people, but conflates "the relationship" with "a
    user record" and leaves no natural home for household-level settings
    later without a structural migration.
  - *A member-count check inside the invite RPC*: redundant once the RPC
    already refuses whenever either party has any existing row - the two-person
    limit falls out of that refusal for free.
  - *Leaving a lone accepted member behind after a decline/leave, with a
    separate "dissolve" action*: adds a state and an action nobody asked for,
    and risks the `already_in_household` deadlock described above if that
    separate action is ever skipped.
  - *Inviting by a shareable link instead of by email*: does not resolve to a
    known `user_id` up front, so RLS/visibility would have to key off
    something other than an accepted `household_members` row, and the product
    ask was specifically "invitation by email, acceptance".
