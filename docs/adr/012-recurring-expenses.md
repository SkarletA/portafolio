# 012. Recurring expenses: posted occurrences from a versioned schedule

## Status

Proposed

Replaces the earlier draft of this ADR number (options A/B/C). It keeps that
draft's option A (real transactions created from templates) and settles its open
questions as described below.

Amends [ADR-004](./004-goal-transfers.md), section "Write paths": `save_transaction`
remains the only public RPC that writes transactions. Its body moves to
`private.write_transaction(p_owner, ...)`, which `save_transaction` and the posting
job both call. Clients cannot reach the private function.

Builds on [ADR-005](./005-money-arithmetic-in-the-client.md) (amounts typed by the
user and validated in the database; the new money columns follow its Amendment 2),
[ADR-007](./007-household-foundations.md) (visibility without write access) and the
write-through-RPC pattern of [ADR-009](./009-shared-expense-split.md).

## Context

Fixed monthly expenses (subscriptions, rent, utilities) are entered by hand every
month. The user must remember them and retype the same amount, category and payment
method, and a missed charge is noticed late or never.

Every figure in Finora reads `transactions` filtered by date. A recurring charge
must therefore be a real transaction dated on the day it happens. Computing
occurrences at query time, as [ADR-003](./003-installments-and-savings-funding.md)
does for installments, would make every consumer expand them and would give
occurrences no identity, which breaks refunds ([ADR-006](./006-reimbursement-purchase-links.md)),
splits ([ADR-009](./009-shared-expense-split.md)) and single-month edits.

Three requirements shape the design:

- Editing a template must not rewrite charges that have already happened, and a
  change announced for a future date must apply from that date.
- A charge the user deletes must not come back on a later run.
- The posting job runs without a user session, so it cannot rely on `auth.uid()`.

## Decision

1. **Mechanism.** A `pg_cron` job runs every hour and calls
   `private.post_due_recurring_occurrences(p_as_of date)` with
   `p_as_of = (now() at time zone 'utc')::date - 1`. Each run scans every active
   template and posts every due date since its start that has no occurrence row,
   not only today's. A missed run (outage, paused project) is therefore recovered
   by the next run, with each charge keeping its own scheduled date. No client
   generates occurrences.

   **Assumption, not verified:** `pg_cron` resumes its jobs after a project pause.
   The jobs live in the database and a restore starts from a physical backup, so it
   is probable, but this ADR does not rely on it being true. Mitigation: a template
   with an unposted overdue date is shown as overdue in the template list, with a
   "post now" action that calls the same idempotent function, limited to the user's
   own templates. If the cron did not resume, the failure is visible instead of
   silent. **Pending check:** verify the resume behaviour on a test project, never on
   production. Disabling the extension deletes every scheduled job, so the migration
   creates jobs with `cron.schedule` and never disables and re-enables the extension.

2. **Three tables; `transactions` does not change.**
   - `recurring_expenses`: identity and schedule. `user_id`, `frequency`
     (`'monthly'` only, by CHECK), `day_of_month` (1 to 31), `start_on`,
     `ended_on` (nullable), `last_error`, `last_error_at`.
   - `recurring_expense_terms`: the editable terms, versioned by `effective_from`.
     `recurring_expense_id`, `user_id`, `effective_from`, `description`,
     `amount` (numeric with the ADR-005 Amendment 2 CHECKs), `category_id`,
     `payment_method`. Unique on (`recurring_expense_id`, `effective_from`).
   - `recurring_occurrences`: one row per scheduled date. `recurring_expense_id`,
     `user_id`, `scheduled_date`, `term_version_id`, `transaction_id` (unique,
     `on delete set null`). Unique on (`recurring_expense_id`, `scheduled_date`).
   The scheduled date is the occurrence's identity, not `transactions.date`, because
   the user may move a posted transaction.

3. **Posting rule.** For each active template and each monthly date `d` with
   `start_on <= d <= min(p_as_of, ended_on)` that has no occurrence row, the job
   inserts the occurrence with `on conflict do nothing` and calls
   `private.write_transaction(user_id, ..., d, ...)` with the terms in force on `d`
   (the latest term with `effective_from <= d`). Each occurrence runs in its own
   block with an exception handler: a failure rolls back that occurrence and sets
   `last_error`, and the next run retries it.

4. **Month end.** `d = make_date(y, m, least(day_of_month, last day of m))`, anchored
   on `day_of_month` and never chained from the previous occurrence. A template on
   the 31st posts on the 28th or 29th in February and on the 31st again in March.

5. **Edits.** `update_recurring_expense(p_id, p_effective_from, ..., p_today)`
   requires `p_effective_from > p_today` and inserts a term version. Charges before
   `effective_from` keep their terms, and the job never updates a posted
   transaction. Day and frequency are not editable: cancel and create again.

6. **Creation.** `create_recurring_expense(...)` sets `start_on = p_today + 1` and
   inserts term version 1. Nothing is backfilled. The first charge is the first
   scheduled date after today.

7. **Cancellation.** `cancel_recurring_expense(p_id, p_ended_on, p_today)` requires
   `p_ended_on >= p_today` and sets `ended_on` once. Unposted dates up to `ended_on`
   still post later; dates after it never post. No reactivation in v1.

8. **Deleting or editing a posted charge.**
   - Deleting a posted transaction uses the existing delete. `on delete set null`
     clears `transaction_id`, and the occurrence row stays as a tombstone that blocks
     regeneration. The UI shows it as "Skipped".
   - Editing a posted transaction uses `save_transaction` on that transaction only.
     The template is unchanged, and the occurrence keeps its `scheduled_date`.

9. **Single writer.** `save_transaction` keeps its signature (13 arguments) and
   becomes a wrapper: after the authentication check it returns
   `private.write_transaction(auth.uid(), ...)`. Inside the body, the partner lookup
   stops calling `household_member_ids()` (which reads `auth.uid()`) and queries
   `household_members` by `p_owner`. The `private` schema is not exposed and has no
   grants to `anon` or `authenticated`.

10. **Visibility.** The three tables get the ADR-007 select policy (`user_id in
    (select public.household_member_ids())`). They get no client insert, update or
    delete grant, following ADR-009's `transaction_shares` pattern. All writes go
    through the RPCs, which check `auth.uid() = user_id` and return
    `recurring_not_found` otherwise. The v1 UI shows only the user's own templates.

11. **Totals.** Only posted transactions exist, so Dashboard, Budgets and Analytics
    need no change and never count a charge before its date. "Upcoming charges" is a
    client-side expansion of schedule and terms, shown in a separate list and never
    summed into a total.

12. **Time zone.** Scheduled dates are calendar dates without a zone. The client
    supplies `p_today` as its local date, as `save_transaction` already does.
    **Target zone: Mexico City (UTC-6, no daylight saving time).** With the rule in
    decision 1, a charge dated `d` is posted by the first hourly run after 00:00 UTC
    of `d + 1`, which is 18:00 on `d` in Mexico City, plus up to one hour of cron
    delay. The charge therefore appears in the evening of its own date and is never
    shown before it. A future move of the timezone to a profile setting is out of
    scope.

13. **v1 scope.** Monthly only. One payment method. Expense only. Not financed, not
    funded by savings, not shared, not tagged as household. Reimbursements work
    unchanged against a posted transaction. The shared rent case and the household
    tag are decided in "Interaction with existing features".

## Interaction with existing features

| Case | v1 | Reason |
| --- | --- | --- |
| Shared expense with a split (Case A, ADR-009) | Out of v1. First improvement after v1, with Case B. | Posting needs an accepted partner, and if the household ends, posting fails with no way to finish. To include it later the template needs a split term (`shares` per effective date), a confirmation step so the partner accepts the split, and a rule for a household that ends (pause the template and surface it, or post as owner-only). |
| Household tag without a split (Case B, ADR-010) | Out of v1. First improvement after v1, with Case A. | `save_transaction` requires an active household when `is_household_expense` is true (migration `20261001090000`, step 5). To include it, the template needs a household-tag term and a rule for a household that ends before a charge posts. Options to decide with the product owner: post without the tag and surface it, or pause and surface the error. Adding it is one more term field; the model does not change. |
| Split across several payment methods | Out. | Multiplies the edit UI. A subscription uses one instrument. |
| MSI (financed) | Out, incompatible. | A recurring series is not financed. |
| Covered by savings (Goal withdrawal) | Out of v1. Designed later. | The template has no Goal field, and posted charges are always income-funded. When it is designed: if the Goal lacks funds the charge is **not** posted, the occurrence is marked failed with its error visible, and the funding source is never changed silently. |
| Linked reimbursements (ADR-006) | Works without new code. | They point at the posted transaction's `id`, which is an ordinary row. Needs a test. |
| Credit card entity (separate design task) | Does not depend on it. | `payment_method` stays text in v1. Later, a nullable `card_id` in the terms. The date of a card charge can differ from the statement; the user moves the posted transaction and `scheduled_date` prevents duplicates. |
| Visibility and RLS (ADR-007) | Select for the household, no write grants, writes through RPCs. | Visibility, not ownership. Matches ADR-009. |

## Implementation

Only after this ADR is accepted and the timezone and pause checks are complete.

- Migration `supabase/migrations/<timestamp>_recurring_expenses.sql`:
  - The three tables, their CHECKs, indexes, the household select policies, and no
    client write grants.
  - The `private` schema, `private.write_transaction` (the body moved from the latest
    `save_transaction`, with the owner as a parameter), and the `save_transaction`
    wrapper.
  - `create_recurring_expense`, `update_recurring_expense`,
    `cancel_recurring_expense` (`security definer`, `set search_path = ''`, executable
    by `authenticated` only).
  - `private.post_due_recurring_occurrences(date)`, not executable by clients.
  - `cron.schedule('post-recurring-occurrences', '0 * * * *', ...)`.
- `pg_cron` is available on the project (default version 1.6.4) but not installed.
  The migration runs `create extension pg_cron` and it needs the same confirmation
  before it is applied.
- `database.types.ts` regenerated after the migration is applied (temporary file
  and diff first, as CLAUDE.md requires).
- `domain/recurring.ts` (pure): clamped scheduled date, term lookup, next charge,
  upcoming list. Unit tests for month end, February, the 31st across years, and the
  Mexico City posting time.
- Regression: `supabase/tests/*.sql` must pass after the `save_transaction` split.
- New SQL tests: a second run posts nothing; deleting a charge leaves a tombstone; an
  edit does not rewrite posted rows; a cancelled template stops; a failure rolls back
  and retries; a run after a simulated outage posts every missed date.

## Consequences

- No query in Budgets, Analytics, Dashboard or the household view changes.
- A late run posts past charges with their real dates, so a past month's figures can
  change after the fact. This is already true when a transaction is edited (ADR-003
  keeps no snapshots).
- Mexico City users see a charge in the evening of its date. Users in zones east of
  UTC would see it up to a day late.
- `save_transaction` is refactored, and every transaction write depends on it. It
  ships with the regression tests.
- `pg_cron` becomes a platform dependency.
- Whether `pg_cron` resumes after a project pause is an unverified assumption
  (Decision 1). Overdue templates and the user-initiated "post now" action make a
  stopped cron visible and recoverable. The check is pending on a test project.
- The existing timezone inconsistency (`domain/date.ts` uses local days, while
  `domain/analytics.ts` and `transactionsService.ts` compute the current month in UTC)
  is not fixed here. It gets its own ADR and PR before the posting job.

## Event rules

| Event | Result |
| --- | --- |
| Create a template | Inserts the template with `start_on = today + 1` and term version 1. Posts nothing now. Past months are not backfilled. |
| A scheduled date arrives | The job posts the transaction with the terms in force on that date, dated with the scheduled date. |
| Edit amount, category, description or payment method | Adds a term version with `effective_from > today`. Earlier charges keep their terms. Posted transactions do not change. |
| Edit day of month or frequency | Not allowed. Cancel and create a new template. |
| Cancel | Sets `ended_on >= today` (default today). Unposted dates up to `ended_on` still post. After it, nothing posts. A second cancel is rejected. No reactivation in v1. |
| Delete a posted charge | Plain delete. The occurrence row stays with `transaction_id = null` and blocks regeneration. Shown as "Skipped". |
| Edit one posted charge | `save_transaction` on that transaction only. Template unchanged. The occurrence keeps its `scheduled_date`. |
| Day 29, 30 or 31 in a short month | Posts on the last day of that month. The next month returns to the configured day. |
| The job fails and recovers | The failing occurrence is rolled back and `last_error` is set. The next hourly run retries. On recovery, every missed date posts with its own terms and date. Unique indexes prevent duplicates. |
| Two runs or two tabs at once | Unique indexes and `on conflict` make the second attempt a no-op. Edits and cancels lock the template row (`for update`) before writing terms. |
| Household partner sees someone else's template | Read-only through the select policy. Write RPCs return `recurring_not_found`. Not shown in the v1 UI. |
| An unposted date is overdue (for example, after a paused project) | Shown as overdue in the template list. A "post now" action calls the same idempotent function, limited to the user's own templates. Duplicates are prevented by the unique indexes. |

## Alternatives considered (rejected)

- **Virtual occurrences expanded at query time (ADR-003 style).** Every consumer
  would expand them, occurrences would have no identity, and refunds, splits and
  single-month edits would need an exception table. The installment pattern fits
  fixed parts of one purchase, not independent events.
- **Lazy generation when the owner opens the app.** Nothing posts if the owner does
  not open the app, and the partner cannot trigger it because ADR-007 forbids writing
  rows under another `user_id`.
- **Edge Function on a schedule.** Same rule, but it needs a service key and a deploy
  path for logic that belongs with the data. Fallback only if `pg_cron` cannot be used.
- **Duplicating the insert logic in the posting job.** Copies about 150 lines of
  validation that would drift.
- **Impersonating the owner (setting JWT claims) to call `save_transaction`.** Fragile,
  and it gives a process without a user the privileges of a session.
- **`recurring_expense_id` on `transactions`.** Deleting a charge would delete the
  marker, and the job would post it again.
- **One term row updated in place.** It cannot express a change that starts on a
  future date, and past prices would depend on when the job ran.
- **Materialized future rows.** They would count in current-month totals and Budgets
  before their date.
- **Financed, savings-funded, shared or household-tagged recurring charges in v1.**
  Each one adds a runtime dependency (funds in a Goal, a partner, an installment plan,
  an active household) that can fail after the charge has been decided.

## Open decisions

Resolved for this ADR:

1. **pg_cron after a pause:** an unverified assumption. Mitigated by the overdue state
   and the "post now" action (Decision 1). Pending check on a test project, never on
   production.
2. **Case A and Case B:** out of v1, documented as the first improvements after v1
   (Interaction with existing features).
3. **Covered by savings:** out of v1. The rule for when it is designed is in the
   Interaction table.

No decision is open for v1.
