# 019. Recurring expenses: deactivate/reactivate and delete (replaces Cancel)

## Status

Accepted.

Amends [ADR-012](./012-recurring-expenses.md), replacing decision 7
(cancellation) in full: `cancel_recurring_expense` is retired and no RPC
writes `ended_on` going forward. The `ended_on` column stays in the schema
(see Implementation) purely to hold the converted history of templates
cancelled before this ADR; nothing new ever sets it again.

Interacts with [ADR-016](./016-recurring-expense-planned-end.md): a planned
end stays exactly as it is today — a separate, self-expiring, reversible
state the job clamps with its own `least()`. This ADR adds a second,
independent mechanism (deactivate/reactivate) the job must clamp without
conflating the two. A template can be both deactivated and carry a planned
end at once, the same way ADR-016 already lets a template be both cancelled
and planned-ended at once.

Interacts with [ADR-018](./018-recurring-expense-leave-household-warning.md):
its "active" shared/tagged templates query needs one more filter (see
Implementation) now that "not cancelled" is no longer the only thing "active"
means.

## Context

Cancellation (ADR-012 decision 7) was the wrong shape: an irreversible
`ended_on`, no delete, no reactivation. A cancelled template stays in the
list forever as noise, and a template that's only paused (a gym membership
during a trip) has no way back without creating a new one and losing
history.

The product asks for two independent primitives: a reversible
Activate/Deactivate toggle ("might be needed again"), and Delete ("this
template is gone"), which must keep every charge it already posted as
ordinary transaction history. The planned end (ADR-016) is untouched.

The mechanism this collides with is ADR-012 decision 1:
`private.post_due_recurring_occurrences` recovers every unposted date since
`start_on` on every run, by design, so a paused Supabase project or a cron
gap self-heals. That same recovery must not republish dates that elapsed
while the user had the template deliberately deactivated, across any number
of deactivate/reactivate cycles, without the schema growing a row per cycle.

A second, independently verified problem surfaced while designing the
migration of today's already-cancelled templates (see decision 7 and
Implementation). Checked directly against production on 2026-10-12
(read-only `select` against `public.recurring_expenses where ended_on is
not null`): 12 rows had `ended_on` set, all of them test templates on two
test accounts, since deleted by hand — this migration affects 0 rows in
production. The finding is kept here only as the historical record that
shaped decision 7: applying the actual stop date the job enforces,
`least(ended_on, coalesce(planned_end_on, ended_on))`, to that same set of
12 rows would have produced 2 deactivated and 10 active-with-a-planned-end,
not the 12 straight deactivations a naive `deactivated_since := ended_on`
rule would have produced — 10 of those 12 were still committed to posting
through a later date. The conversion rule (decision 7) and its test
coverage (Implementation, PR 1) must stay correct for any environment that
does carry real cancelled rows, which is why both branches are still
required and tested even though today's production data no longer
exercises them.

## Decision

1. **Two new columns on `recurring_expenses`, not one**, because they
   answer two different questions the job needs answered separately.

   - `deactivated_since date` (nullable): non-null means "currently
     deactivated, as of this date." Drives the job's per-template skip, the
     card's display, and gates "Post now."
   - `active_from date` (nullable): the floor below which the job never
     again considers a candidate date, regardless of how long ago it was.
     Null means "no floor beyond `start_on`."

   Neither reuses `ended_on` (final, legacy, no longer written) or
   `planned_end_on` (ADR-016's self-expiring, product-chosen stop). A single
   `is_active boolean` answers "right now" but not "how far back should
   resuming look"; a single `deactivated_since` cleared on reactivation
   loses exactly that floor the moment it's cleared (see Alternatives).

   ```sql
   constraint recurring_expenses_active_from_after_start
     check (active_from is null or active_from >= start_on)
   ```

   **Amendment on implementation:** `deactivated_since` initially carried
   its own `check (deactivated_since is null or deactivated_since >=
   start_on)`, by analogy with `active_from`'s. Running
   `supabase/tests/recurring_expenses.sql` against the live project after
   PR 2 shipped hit it immediately: `create_recurring_expense` never
   backfills, so a brand-new template's `start_on` is always tomorrow, and
   deactivating it the same day it's created (a legitimate flow - nothing
   here says a user can't pause a template before its first charge) sets
   `deactivated_since = today`, which is before `start_on`. Unlike
   `active_from` - which the job's date loop actually compares against
   (decision 4) - `deactivated_since` was never compared to anything; the
   whole-template skip (decision 6) fires on it being non-null alone. The
   constraint was dropped (`20261012130000_recurring_deactivate_drop_start_check.sql`)
   rather than loosened, since it was never load-bearing.

2. **Deactivating is idempotent, flushes, then pauses.**
   `deactivate_recurring_expense` first checks the current row: if
   `deactivated_since` is already non-null, it is a no-op that returns the
   id unchanged — no error, so a double tap or two open tabs shows no
   failure. Otherwise it calls the existing
   `private.post_due_recurring_occurrences(p_today - 1, v_uid)` — the
   identical, idempotent, owner-scoped call "Post now" already makes,
   **covering only dates strictly before today** (the same cutoff "Post
   now" already uses) — before writing `deactivated_since = p_today`. This
   guarantees any genuinely-overdue date from before the pause (e.g. a cron
   gap) posts first, so the rising floor in decision 4 can never swallow a
   legitimate pre-pause gap.

   **A failure during the flush must never block or revert the
   deactivation.** Structurally it already can't: `post_due_recurring_occurrences`
   runs each date in its own block with its own exception handler (ADR-012
   decision 3) — a different template of the same owner failing for its own
   reason (for example, a savings-funded template with an underfunded Goal)
   sets that template's `last_error` and is simply skipped, never raised to
   the caller. `deactivate_recurring_expense` additionally wraps the flush
   call itself in `begin ... exception when others then null; end;`, as
   defense-in-depth against any unforeseen top-level failure, so no code
   path can make a user's own deactivate action fail because of someone
   else's broken template. Requires an explicit SQL test (decision in
   Implementation).

3. **Deactivating on the same day a charge is scheduled forfeits that
   charge, deliberately.** The flush only covers dates before today,
   mirroring "Post now"'s own cutoff (ADR-012 implementation notes: "Post
   now" never posts today's charge early). If the user deactivates before
   that day's charge has posted, it is skipped immediately by decision 6
   and never recovered — not even by a later reactivation, since
   reactivating never backdates (decision 4). This is the same trade-off
   "Post now" already makes for today's date; it is not new risk.

4. **Reactivating is idempotent and never backfills**, mirroring
   `create_recurring_expense`'s own rule. `activate_recurring_expense` first
   checks the row: if `deactivated_since` is already null, it is a no-op
   that returns the id unchanged. Otherwise it sets `active_from = p_today +
   1` and clears `deactivated_since` — the same "nothing backfilled, first
   charge is the first scheduled date after today" rule already applied to
   `start_on`. The job's loop gains one more floor check alongside its
   existing `continue when v_date < start_on`: `continue when v_date <
   coalesce(active_from, start_on)`.

5. **The pair survives any number of cycles with no growth.** Each
   deactivate overwrites `deactivated_since`; each reactivate overwrites
   `active_from` and clears `deactivated_since`. Nothing is appended; no
   child table records pause history.

6. **The whole template is skipped while deactivated**, not just clamped:
   the per-template loop adds `continue when deactivated_since is not null`
   before any date math. `post_my_recurring_expenses` inherits this for
   free.

7. **`cancel_recurring_expense` is retired, and existing cancelled rows are
   converted by comparing dates, not by a blanket rule.** No RPC writes
   `ended_on` after this ADR. The column stays (dropping it is a later
   decision — Open decisions) but every existing row with `ended_on is not
   null` is converted in the same migration, using
   `S := least(ended_on, coalesce(planned_end_on, ended_on))` — the actual
   effective stop date the old `least()`-based job already enforced:

   - If `S < current_date` (the template had already fully stopped
     posting): `deactivated_since := S`, `ended_on := null`,
     `planned_end_on := null`. Nothing is left to post for it anyway; it
     becomes an ordinary deactivated template, reactivatable and deletable.
   - If `S >= current_date` (the template was still committed to posting
     through `S`): `planned_end_on := S`, `ended_on := null`,
     `deactivated_since := null`. It becomes an ordinary active template
     with a planned end — it keeps posting exactly through the date its
     cancellation had promised, then shows "Completed" (ADR-016), instead
     of stopping early. This is the branch 10 of the 12 rows found on the
     live project (Context) would have taken.

   `planned_charges` is left untouched by this conversion (it is
   display-only; nothing derives from it).

8. **No signature change to `create_recurring_expense`,
   `update_recurring_expense`, or `set_recurring_expense_planned_end`.** A
   new template is always created active. Editing terms or the planned end
   works identically whether active or deactivated — a deactivated template
   can still have its amount/category/planned end changed; the new
   term/plan has no effect until (if ever) reactivated. The existing
   `ended_on is not null -> recurring_ended` guard stays, now permanently
   unreachable after decision 7's conversion, left in place defensively
   rather than removed in the same change.

9. **Delete is unconditional and uniform.** `delete_recurring_expense`
   deletes the `recurring_expenses` row regardless of
   active/deactivated/planned-end-completed state. Existing FKs already do
   the right thing: `recurring_expense_terms.recurring_expense_id` and
   `recurring_occurrences.recurring_expense_id` are both `on delete cascade`
   (ADR-012 schema); `recurring_occurrences.transaction_id references
   transactions(id) on delete set null` only fires when a transaction is
   deleted, not the reverse. Posted charges remain untouched.

10. **The "Recurring" chip on already-posted transactions is lost on
    delete, and that is accepted, not fixed, here.** The chip
    (`Transaction.recurring_occurrence`, `domain/transaction.ts`) joins
    `recurring_occurrences.transaction_id` back to the template; cascading
    the occurrence rows away removes that join target. The transaction's
    amount/date/category/shares stay correct — only the chip disappears.
    `recurring_occurrences.term_version_id references
    recurring_expense_terms(id)` has no `ON DELETE` clause, so it defaults
    to `NO ACTION` — checked at the end of the statement, not immediately,
    the same mechanism ADR-004 already relies on for
    `goal_transfers.goal_id` so that deleting an account cascades through
    both `goal_transfers` and `goals` from `auth.users` in one statement.
    That is exactly why today's cascade already works: deleting a template
    removes its terms and occurrences together in the same statement, so
    the deferred check never sees a dangling reference. It is also why an
    occurrence cannot be kept alive on its own (the "don't cascade
    occurrences" alternative below): `term_version_id` is `not null`, and
    the term it points to still has to cascade-delete with the template, so
    an occurrence left behind would hold a `not null` reference to a row
    that no longer exists — not an option without making `term_version_id`
    nullable too, a bigger schema change (see Alternatives). The delete
    confirmation states the chip loss plainly.

11. **UI: no confirmation for the toggle; Delete keeps the existing
    confirm-before-destructive-action pattern; the toggle is hidden on a
    Completed template.** Toggling is reversible by design and fires
    immediately. Delete reuses the confirm dialog shape the old Cancel
    action had (`RecurringExpenseCard`'s `isConfirmingCancel` state), with
    copy stating how many charges will be kept and that they will stop
    showing the "Recurring" mark. On a template whose planned end has
    already passed ("Completed", ADR-016), the toggle is hidden entirely
    and only Delete is shown: `deactivated_since` takes label precedence
    over `planned_end_on` (decision 7's conversion already relies on this
    precedence), so toggling a Completed template would make it stop
    reading "Completed" for no operational gain — it has nothing left to
    post either way. After a successful reactivation, the card shows the
    newly computed next charge date to confirm the pause actually lifted.

## Implementation

**PR 1 — schema, job, and the legacy-cancellation data migration (no RPC, no
UI change — the smallest safe slice):**

- Migration: `recurring_expenses.deactivated_since date`,
  `.active_from date`, both nullable, with the CHECKs from decision 1.
- A one-time safety flush, unscoped, immediately before the data migration:
  `select private.post_due_recurring_occurrences(current_date - 1, null);`
  — mirrors decision 2's own flush-before-pause rule, applied once at
  cutover for every template. Unlike decision 2's runtime flush, this one is
  **not** wrapped to swallow errors: a migration is expected to fail loudly
  if something is wrong, where a per-user runtime action must not be
  blocked by someone else's unrelated failure.
- The data migration (decision 7):
  ```sql
  update public.recurring_expenses
  set
    deactivated_since = case
      when least(ended_on, coalesce(planned_end_on, ended_on)) < current_date
      then least(ended_on, coalesce(planned_end_on, ended_on))
    end,
    planned_end_on = case
      when least(ended_on, coalesce(planned_end_on, ended_on)) >= current_date
      then least(ended_on, coalesce(planned_end_on, ended_on))
    end,
    ended_on = null
  where ended_on is not null;
  ```
- `private.post_due_recurring_occurrences`: unchanged signature (`create or
  replace function`, no `drop function` needed — only its body changes, as
  ADR-014/015/016 already did). Adds the per-template `deactivated_since is
  not null` skip and the per-date `active_from` floor.
- `database.types.ts` regenerated (temp file, diffed, per CLAUDE.md).
- `20261012130000_recurring_deactivate_drop_start_check.sql`: drops
  `recurring_expenses_deactivated_since_after_start` (decision 1's
  amendment note) — found by running `supabase/tests/recurring_expenses.sql`
  against the live project after PR 2.

**PR 2 — RPCs and service layer, still no visible UI change:**

- New RPCs, each `security definer`, `set search_path = ''`, `auth.uid()`
  checked against a `for update`-locked row owned by the caller,
  `recurring_not_found` otherwise (mirrors `cancel_recurring_expense`'s
  existing pattern):
  - `activate_recurring_expense(p_id uuid, p_today date) returns uuid` —
    idempotent per decision 4.
  - `deactivate_recurring_expense(p_id uuid, p_today date) returns uuid` —
    idempotent, flushes, per decision 2.
  - `delete_recurring_expense(p_id uuid) returns void`.
  - No new error codes: both state-change RPCs are no-ops on a repeated
    call rather than raising (decisions 2 and 4). `recurring_not_found`
    (non-owner or missing id) is the only error either can return.
- `cancel_recurring_expense(uuid, date, date)` is **dropped** in this same
  migration. Even though its own parameter list doesn't change (it's
  removed outright, not replaced with more args), the migration must still
  explicitly `drop function public.cancel_recurring_expense(uuid, date,
  date)` — this is exactly the case CLAUDE.md's "no overloads, ever" rule
  is for, following the precedent in
  `supabase/migrations/20261012090000_drop_legacy_recurring_expense_overloads.sql`.
- `database.types.ts` regenerated.
- `recurringExpensesService.ts`: `activateRecurringExpense`,
  `deactivateRecurringExpense`, `deleteRecurringExpense`;
  `cancelRecurringExpense` removed. `getActiveHouseholdLinkedRecurringExpenses`
  (ADR-018) gains `.is('deactivated_since', null)` alongside its existing
  `.is('ended_on', null)` — a deactivated shared/tagged template poses no
  near-term risk to a household leave, since it won't post until
  reactivated.
- `supabase/tests/recurring_expenses.sql`: its cancellation assertions
  (currently calling `cancel_recurring_expense`) are rewritten against
  deactivate/reactivate/delete in this same PR, so the suite never
  references the dropped function.
- New SQL tests, with controlled fixed dates: two full deactivate/reactivate
  cycles leave only the latest `active_from` in effect; a flush failure on
  one template (e.g. `insufficient_goal_funds` on an unrelated, underfunded,
  savings-funded template owned by the same user) does not block or revert
  deactivation of a different template; pre-existing active templates are
  unaffected (regression); both branches of decision 7's conversion formula
  (an effective stop date in the past, and one today-or-later) produce the
  documented result; `delete_recurring_expense` on a template that already
  has published occurrences deletes the template, its terms and its
  occurrences, while every `transactions` row they posted stays intact and
  unchanged — the existing cascade (decision 9) has never been exercised
  by a test against a template with real posted charges, and this ADR's
  delete feature is the first thing that depends on it actually working.
- `domain/recurring.ts`: `RecurringSchedule` gains `deactivatedSince: string
  | null` and `activeFrom: string | null`. `getScheduledDatesThrough`,
  `getUpcomingCharges`, `getOverdueDates` each gain the same floor the job
  applies and each return empty when `deactivatedSince !== null`.
- **Shared fixtures.** The pause/resume scenarios above are the same rule
  implemented twice — once in `private.post_due_recurring_occurrences`
  (PL/pgSQL), once in `domain/recurring.ts` (TypeScript), exactly the kind
  of duplication ADR-016 already flagged for the skip-rule. The two test
  suites must exercise one shared, named set of cases (`{startOn,
  dayOfMonth, deactivateOn, reactivateOn, expectedDates}`), not two
  independently invented ones, so the SQL test and
  `domain/recurring.test.ts` cannot silently drift onto different rules.

**PR 3 — UI:**

- `RecurringExpenseCard.tsx`: the Cancel icon/confirm flow and the
  `isEnded`/`isFullyStopped`-driven "Cancelled"/"Ending" status branches are
  removed (dead after PR 1's migration). Replaced by an Activate/Deactivate
  toggle icon (fires immediately, no confirm) and a separate Delete icon
  (reuses the existing confirm-dialog shape, with copy stating the count of
  charges kept — computed client-side from `occurrences.filter((o) =>
  o.transaction_id).length`, data the card already has — and that they will
  no longer show the "Recurring" mark). New status label "Deactivated since
  {date}" takes top precedence; "Completed"/"Ends on {date}" (ADR-016) are
  otherwise unchanged. On a Completed template, the toggle is not rendered
  — only Delete is shown (decision 11). After a successful reactivation,
  the card shows "Next charge: {date}" from the newly computed schedule.
  "Post now" and the overdue banner are hidden while deactivated.
- `RecurringExpenses.tsx`: a stable sort places `deactivated_since !== null`
  templates after active ones; deactivated cards get a dimmed visual
  treatment via a new CSS-module modifier class.
- New `en`/`es` keys in the `recurring` namespace for the toggle
  labels/aria-labels/testids, the "next charge" confirmation, and the
  delete confirmation copy (including the kept-charges count, pluralized,
  and the chip-loss notice); cancel-related keys removed. Actual EN/ES
  strings are not written here — flagged per CLAUDE.md so the wording can
  be set/reviewed at implementation time.
- Tests updated: `RecurringExpenseCard.test.tsx`, `RecurringExpenses.test.tsx`.

## Consequences

- No unbounded state: exactly two nullable date columns, overwritten each
  cycle, regardless of how many pause/resume cycles a template goes
  through.
- Deleting an active (non-deactivated) template is now possible and stops
  it immediately, with no `ended_on`-style grace period — simpler than the
  old cancel flow.
- Legacy cancelled templates are converted by comparing dates rather than a
  single blanket rule: whichever branch a row takes (decision 7), it never
  stops posting a single day earlier than cancellation had already
  promised. In production this migration affects 0 rows — the 12 test rows
  that motivated it (Context) were deleted by hand beforehand — but the
  logic and both branches' test coverage (Implementation, PR 1) stay in
  place for any environment that does carry real cancelled rows.
- The "Recurring" chip is lost once a template is deleted, while the
  transaction itself (amount, date, category, shares) stays fully intact.
- `ended_on` is not read by anything new after this ADR but isn't removed
  either — candidate for a later, separate cleanup ADR.
- `cancel_recurring_expense` is gone; any reference to it (tests, stories,
  fixtures) is removed in the same PR that drops it.
- Activate and deactivate being idempotent means the client never has to
  special-case a "you already did that" error from a double tap or a
  second open tab.
- ADR-016's planned-end mechanism is unaffected: a template can be both
  deactivated and have a planned end; the sooner of the two still wins
  mechanically via the job's existing `least()`/floor logic.

## Event rules

| Event | Result |
| --- | --- |
| Create a template | Always starts active: `deactivated_since`/`active_from` both null. No change from ADR-012. |
| Deactivate (currently active) | Flushes dates strictly before today (owner-scoped, `p_today - 1`); a flush failure cannot block or revert the deactivation (decision 2). Sets `deactivated_since = today`. |
| Deactivate (already deactivated) | No-op; returns the id unchanged. |
| A scheduled date arrives while deactivated | The job skips the whole template. No occurrence row is ever created — not posted, not tombstoned, simply never attempted. |
| Deactivate on the same day a charge is scheduled | The flush does not cover today, so that charge is not flushed; it is then skipped immediately by the deactivation and never posts, even after a later reactivation (decision 3). |
| Reactivate, same day as a scheduled charge | `active_from = today + 1`. That day's charge is NOT posted — never backfilled, same as a date before a brand-new template's own `start_on`. |
| Reactivate, a different day | Same rule: `active_from = that day + 1`. Next charge is the first scheduled date strictly after reactivation. |
| Reactivate after several months | Identical rule; `active_from` jumps to `today + 1` regardless of pause length. Every intervening date is permanently skipped. |
| Reactivate (already active) | No-op; returns the id unchanged. |
| Deactivate/reactivate multiple times | Each cycle only overwrites the two columns; only the latest `active_from` matters. No growth. |
| Edit a deactivated template | Works exactly as on an active template — new term version (or planned-end change) recorded, with no effect until (if ever) reactivated. |
| "Post now" while deactivated | Hidden/disabled in the UI; the backend also skips the template entirely even if called. |
| Delete a template with already-posted charges | Template/terms/occurrences deleted (cascades); `transactions` untouched and remain as history. "Recurring" chip disappears. Confirmation states the count kept and the chip loss. |
| Delete a shared/household-tagged template | Same as above. `transaction_shares` hang off `transactions`, not the template, so a partner's historical split stays intact; only the chip is lost. No partner notification (matches ADR-014/015 precedent). |
| Delete a template that reached its planned end (Completed) | Same as any other delete — "Completed" is a derived, non-persisted label (ADR-016), nothing special required. |
| Household partner views a deactivated/about-to-be-deleted template | Read-only (ADR-007), unchanged: write RPCs return `recurring_not_found` for a non-owner. |
| Legacy cancelled template, effective stop `S = least(ended_on, coalesce(planned_end_on, ended_on))` already in the past at migration time | `deactivated_since = S`, `ended_on = null`, `planned_end_on = null`. Appears as an ordinary deactivated template. |
| Legacy cancelled template, `S` today or in the future at migration time | `planned_end_on = S`, `ended_on = null`. Appears as an ordinary active template with a planned end, continuing to post exactly through the committed date. |

## Alternatives considered (rejected)

- A single boolean `is_active`, no floor date — rejected: reactivation would
  republish every elapsed date, the exact outcome this ADR exists to
  prevent.
- `deactivated_since` alone, cleared on reactivation — rejected: the moment
  it's cleared, the pause window it recorded is gone.
- A child table logging every pause/resume cycle — rejected: grows without
  bound; nothing ever needs more than the latest floor.
- Reusing `ended_on` or `planned_end_on` for pause state — rejected: both
  already carry a settled, different meaning; folding in a third would
  reopen the ambiguity ADR-016 already resolved once.
- A template-scoped variant of `post_due_recurring_occurrences` for the
  deactivate-time flush — rejected for v1: reusing the existing
  owner-scoped function avoids a third parameter and a second code path for
  the same idempotent operation.
- Not cascading `recurring_occurrences` on delete, to preserve the chip —
  rejected: `term_version_id` is `not null`, and `recurring_expense_terms`
  still has to cascade-delete with the template; an occurrence kept alive
  on its own would hold a `not null` reference to a deleted term, which
  only `NO ACTION`'s end-of-statement check (not `RESTRICT`) tolerates when
  both rows are removed together in the same statement, not when one is
  kept and the other isn't.
- Stamping a marker directly onto `transactions` to survive deletion —
  already rejected once in ADR-012's own Alternatives, for a different
  reason (duplicate-posting risk); reopening it for a display chip only is
  the same speculative schema growth CLAUDE.md asks to avoid.
- A blanket `deactivated_since := ended_on` for every legacy cancelled row —
  rejected after checking the live project (Context): 10 of the 12 rows
  found there had an effective stop date (`least(ended_on,
  coalesce(planned_end_on, ended_on))`) today or later and would have been
  stopped mid-schedule, before the date their own cancellation had already
  committed to.
- Raising `recurring_already_deactivated` / `recurring_not_deactivated` on a
  repeated activate/deactivate call — rejected: a double tap or two open
  tabs on a reversible action should not surface an error.
- Swallowing errors in the one-time migration-time safety flush, the same
  way the runtime deactivate RPC does — rejected: an ops migration should
  fail loudly if something is actually wrong; only the per-user runtime
  action must be shielded from someone else's unrelated failure.

## Open decisions

None open; confirmed by the product owner:

1. Legacy cancelled templates become reactivatable/deletable on migration,
   not left frozen — yes.
2. `ended_on` stays in the schema, unused, rather than dropped now — kept
   for one release cycle, dropped in a later, separate cleanup ADR.
3. Deactivating opportunistically flushes the owner's other overdue
   templates too (owner-scoped reuse) — accepted as benign.
4. A Completed (planned-end-reached) template hides the toggle entirely and
   shows only Delete, rather than keeping a functional but confusing
   toggle — confirmed.
5. The "Recurring" chip disappears from past charges once their template is
   deleted — accepted, stated plainly in the delete confirmation copy.
6. Column and function names (`deactivated_since`, `active_from`,
   `activate_recurring_expense`, `deactivate_recurring_expense`,
   `delete_recurring_expense`) as proposed — confirmed.
7. Reactivating never posts the same day's charge (`active_from = today +
   1`, not `today`) — confirmed.
8. The legacy migration converts each row by comparing `ended_on`/
   `planned_end_on` against the day the migration runs, not with a single
   uniform rule — confirmed, verified against the live project's actual
   data (Context, decision 7).
9. Activate and deactivate are idempotent no-ops on a repeated call, never
   errors — confirmed.
