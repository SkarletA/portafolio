# 013. Calendar dates: the client uses the local day

## Status

Accepted

## Context

Finora's dates are calendar days: `transactions.date` is a `date` with no zone, and
a charge "on 30 September" belongs to the user's September wherever they are. The
code was not consistent about "today":

- `domain/date.ts` (`getTodayLocalDate`) reads the device's local day, and every form
  that stores a date uses it.
- `domain/analytics.ts` (`getPeriodRange`), `services/analyticsService.ts`
  (`getTrendWindow`, `daysElapsedInRange`) and `services/transactionsService.ts`
  (`getCurrentMonthRange`) read the UTC clock with `getUTC*`.

For a user in Mexico City (UTC-6, no daylight saving time), the two disagree every
evening from 18:00 on the last day of a month. At 18:00 on 30 September the UTC date is
already 1 October, so the Dashboard and Analytics showed October while the form,
the transaction list and the saved dates said September. The same shift affects:

- **Average per day:** the elapsed-days count uses the UTC day, so on the evening of
  1 October it counts two days for one.
- **Daily and yearly views:** from 18:00 the "today" is tomorrow, and on 31 December
  at 18:00 the "year" is the next one.
- **Dashboard month label:** the header formatted `new Date()` in UTC.

ADR-012's posting job is the exception: it runs on the server, with no device, and
decides by the UTC date (see below).

## Decision

1. **Client dates are local calendar days.** Any "today", current month, current
   year, trend window or elapsed-days count derives from the device's local date
   (`getTodayLocalDate`, or `getLocalCalendarDate` in `domain/date.ts`, which returns
   the local day as a UTC-midnight `Date`). Calendar arithmetic on those days can use
   `Date.UTC` and `getUTC*`, because the value no longer depends on the zone.
2. **Date-only values are displayed in UTC, never converted.** A `YYYY-MM-DD` string
   from the database is parsed as UTC midnight and formatted with `timeZone: 'UTC'`.
   Converting it to the local zone would show the previous day west of UTC.
3. **Server processes are the explicit exception.** A process with no user device
   decides by a fixed rule and documents it. ADR-012's posting job uses
   `(now() at time zone 'utc')::date - 1`, which posts each charge at 18:00 in Mexico
   City on its own date.
4. **The test suite runs in Mexico City time** (`vitest.globalSetup.js`). A worker
   takes its zone when it is created, so a test cannot set it. With a fixed zone the
   boundary tests give the same result on any machine, including UTC CI runners.
5. **No stored data changes.** The fix is in how ranges are computed; no row is
   rewritten.

## Consequences

- Dashboard, Analytics, Budgets and the transaction list share one definition of the
  current month, and it matches the date the user picks in the form.
- Within a user's own zone, a month, day or year changes at local midnight. A user
  who travels to another zone sees the period of the zone the device is in, which is
  the intended behaviour.
- Users east of UTC (for example Tokyo) have the mirror-image bug: in the first hours
  of each day, month or year, the UTC date is still the previous one. Tokyo at
  00:00 on 1 October is 30 September in UTC. The same rule fixes them too.
- Any new date logic must follow rule 1 or 2. A `new Date()` that reaches a `getUTC*`
  getter, or a `Date.UTC` built from a local date, is a bug.

## Revisit when

- A user-selectable time zone is added (a profile setting). The rule would then be
  "the profile's zone", and the server rule in decision 3 would need the same setting.
- Finora gets a second zone for the posting job (for example, per user rather than
  per project).
