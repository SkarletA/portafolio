# 016. Recurring expenses: planned end (fixed-count or fixed-date templates)

## Status

Accepted

Amends [ADR-012](./012-recurring-expenses.md): its cancellation model already
distinguishes "cancel" (`ended_on`, irreversible, no reactivation) from
"nothing was ever planned to stop." This ADR adds a third state - a planned
end, decided at creation or later, that the owner can extend or remove,
unlike a cancellation.

Does not cover changing a template's day of month or frequency after
creation. That was evaluated alongside this ADR and rejected for now; see
"Rejected: changing day of month or frequency" below.

## Context

A template today only stops by manual, irreversible cancellation
(`cancel_recurring_expense`, ADR-012 decision 7). A real case has no such
requirement: an annual membership paid in 12 fixed monthly instalments has a
known end from day one. Reusing `ended_on` for this would conflate two
different states: `update_recurring_expense`/`cancel_recurring_expense`
already refuse to touch a template once `ended_on is not null`
(`recurring_ended`, `recurring_already_cancelled`), which is exactly wrong
for a planned end the owner may want to extend or remove later.

This is not instalment financing of a single purchase
([ADR-003](./003-installments-and-savings-funding.md)): it is an ordinary
monthly template that simply stops posting itself after N charges or a date.

## Decision

1. **A new column, not a reuse of `ended_on`.** `recurring_expenses` gains
   `planned_end_on date` (nullable), with
   `constraint recurring_expenses_planned_end_after_start check (planned_end_on is null or planned_end_on >= start_on)`.
   `ended_on` keeps its exact current meaning (manual, final cancellation).

2. **A count is translated to a date once, never recomputed by the job.**
   The job runs hourly over the template's whole history; pushing "N
   charges" logic into its loop would duplicate date math already solved by
   `private.scheduled_date`. **Amendment on implementation:** the
   translation happens once, but client-side (`getNthScheduledDate` in
   `domain/recurring.ts`), not in SQL as first sketched - the job already
   has to skip a candidate date that falls before `start_on` (when
   `day_of_month` is earlier in the month than `start_on`'s own day), and
   replicating that same skip rule correctly in plpgsql would duplicate
   logic that already exists, tested, in the pure domain layer. The RPCs
   only validate the date they're given (`private.assert_recurring_planned_end`)
   and never derive one from a count - the same client-boundary rule
   ADR-005 already applies to money. Only the resulting date is persisted.
   `recurring_expenses.planned_charges integer` (nullable, capped at 1..600 -
   50 years) additionally stores the count, **display-only** ("charge 12 of
   12"); the job never reads it, only `planned_end_on`.

3. **Whichever end is sooner wins, mechanically.**
   `private.post_due_recurring_occurrences`'s existing clamp
   `v_limit := least(p_as_of, coalesce(ended_on, p_as_of))` becomes
   `v_limit := least(p_as_of, coalesce(ended_on, p_as_of), coalesce(planned_end_on, p_as_of))`.
   No new branch, no precedence rule to write down: cancelling a template
   that already had a planned end simply tightens the same `least()`.

4. **The job never writes to `planned_end_on` or `ended_on`.** Reaching the
   planned end is not a mutation - it is the absence of any future candidate
   date past that clamp, exactly like a cancelled template today. "Completed"
   is derived client-side (`plannedEndOn !== null && today > plannedEndOn`),
   never persisted, matching ADR-014's "no new table, no persisted paused
   state." Cancellation still takes display priority: the card only reaches
   the planned-end statuses once `ended_on` is null, the same precedence
   `v_limit`'s own `least()` already gives cancellation mechanically.

5. **A planned end is editable at any time the template itself still is**
   (i.e. `ended_on is null`), through a new, dedicated RPC -
   `set_recurring_expense_planned_end(p_id uuid, p_planned_end_on date
   default null, p_planned_charges integer default null, p_today date
   default null)` - not through `update_recurring_expense`. The two are
   deliberately separate: `update_recurring_expense` inserts a new term
   version on every call, and a planned-end change is not a financial term -
   forcing it through that path would insert a needless, identical term row
   every time only the end changes. `cancel_recurring_expense` is the
   existing precedent for a small, dedicated RPC mutating one plain column.
   Passing both parameters as `null` removes the planned end. Takes effect
   immediately (no `effective_from`): it only ever affects dates that have
   not posted yet.

6. **`create_recurring_expense` gains `p_planned_end_on date default null,
   p_planned_charges integer default null`**, so a template can start with a
   planned end from day one, with the same validation as (5).

## Implementation

- Migration (schema): `recurring_expenses.planned_end_on`,
  `.planned_charges`, the new CHECK. No behaviour change; every existing row
  keeps both null.
- Migration (RPC/job): `create_recurring_expense` gains the two trailing
  defaulted parameters; new `set_recurring_expense_planned_end`;
  `private.post_due_recurring_occurrences`'s `v_limit` gains the third
  `least()` term. `update_recurring_expense` is unchanged.
- New error code: `invalid_planned_end` (both a date and a count given
  together, a count outside 1..600, or a date before `start_on`/before
  `p_today`).
- `database.types.ts` regenerated after the migrations are applied.
- `domain/recurring.ts`: `RecurringSchedule` gains `plannedEndOn: string |
  null`; `getScheduledDatesThrough`, `getUpcomingCharges`, `getOverdueDates`
  clamp by the earlier of `endedOn`/`plannedEndOn` instead of `endedOn`
  alone.
- `recurringExpensesService.ts`: `setRecurringExpensePlannedEnd`;
  `createRecurringExpense` accepts the two new fields.
- `AddRecurringExpense.tsx`: an "Ends: Never / After N charges / On a date"
  fieldset, mutually exclusive, editable immediately in edit mode (no future
  `effective_from` needed). `RecurringExpenseCard.tsx`: a third status,
  "Ends on {date}" (future) / "Completed on {date}" (past), distinct from
  "Cancelled" (`ended_on`-driven).
- New `en`/`es` keys in the `recurring` namespace.

## Consequences

- No new table, no job-side state mutation: the planned end is a pure
  additional clamp on the same `least()` the job already computes.
- A template can carry both a manual cancellation and a planned end at
  once; the sooner one always governs, with no code path deciding "which
  wins."
- `ended_on` keeps meaning exactly one thing (final, irreversible). A
  planned end is reversible by design, which is the whole point of
  separating the two.

## Event rules

| Event | Result |
| --- | --- |
| Create with a planned end (count or date) | `planned_end_on` (and, if given as a count, `planned_charges`) set from creation. |
| Edit the planned end (extend, shorten, or remove) | `set_recurring_expense_planned_end`, no new term version, takes effect immediately. Refused (`recurring_ended`) if the template is already cancelled. |
| A scheduled date passes `planned_end_on` | Not posted. `ended_on` and `planned_end_on` are both untouched. |
| Cancel a template that has a planned end | `ended_on` set as today (ADR-012 decision 7); the `least()` now reflects whichever date is sooner. |
| The planned end passes with no cancellation | Shown as "Completed on {date}", derived client-side; nothing is written. |

## Alternatives considered (rejected)

- **Reusing `ended_on` for a planned end set at creation.** Rejected:
  `update_recurring_expense`/a second `cancel_recurring_expense` already
  treat any non-null `ended_on` as final, which is the opposite of "extend
  or remove later."
- **Storing only a count, translated to a date by the job on every run.**
  Rejected: the job already recomputes every month's candidate date from
  `day_of_month` on every run; adding count-to-date math to that hot loop
  duplicates `private.scheduled_date` and reintroduces exactly the kind of
  per-run derived state ADR-012 avoided for occurrences themselves.
- **Folding the planned end into `update_recurring_expense`.** Rejected: it
  is not a financial term: forcing it through term versioning would insert
  an identical term row on every planned-end-only change.

### Rejected: changing day of month or frequency

Evaluated alongside this ADR, at the user's request, and explicitly not
built. The posting job recomputes every month's candidate date, including
already-posted months, from the template's current `day_of_month` on every
run (`private.post_due_recurring_occurrences`); mutating that column
in place would make the next run compute a *new* date for an
already-posted month and post it again, duplicating that month's charge.
Versioning `day_of_month` in `recurring_expense_terms` (like `amount`) would
fix the duplication but introduces a real ambiguity: deciding which term's
day applies to a given month requires knowing the candidate date, but which
term is "in force" is decided by comparing `effective_from` to that same
date - circular. The only clean resolution found (use the term in force on
the first day of the month, not the computed charge date, to pick that
month's day) is a second, different "which term applies" rule from the one
`amount`/`category_id`/`is_shared` already use (they look at the real charge
date), and it would make a day-of-month change not take effect until the
following month even when `effective_from` is earlier - contradicting the
expectation the form already sets for every other field ("applies from the
date you choose"). Frequency has no second value to change to today (the
CHECK is fixed to `'monthly'`), so there is nothing yet to design for it.
Given the cost (a second term-resolution rule, UX ambiguity in the
transition month, changes to the job's hot loop) against the value (cancel
and recreate costs one form, loses only history continuity), "cancel and
create another" remains the answer, unchanged from ADR-012.

## Open decisions

None open; confirmed by the product owner:

1. `planned_charges` is kept (display-only, the job never reads it).
2. The cap on `p_planned_charges` is 1..600 (50 years).
