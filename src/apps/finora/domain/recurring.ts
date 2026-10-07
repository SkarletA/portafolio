import { getDaysInMonth } from './installments'

// Pure schedule math for recurring expenses (ADR-012). Dates are YYYY-MM-DD
// calendar days, compared as strings, which orders them correctly. Months are
// 1-based.

export interface RecurringSchedule {
  startOn: string
  endedOn: string | null
  dayOfMonth: number
}

export interface RecurringTerm {
  effectiveFrom: string
  description: string
  amount: number
  categoryId: string | null
  paymentMethod: string
  /** ADR-014: whether this term's charge is split with a household partner. */
  isShared: boolean
  /** The owner's own part; present if and only if isShared. */
  ownerShareAmount: number | null
  /** ADR-015: the full amount, tagged as the household's, no split. Mutually exclusive with isShared. */
  isHouseholdExpense: boolean
}

export interface UpcomingCharge {
  date: string
  term: RecurringTerm
}

// The job never looks further than this many months ahead when scanning for
// upcoming charges, so a template with no end date cannot make the scan run
// forever.
const MAX_SCAN_MONTHS = 1200

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1]
}

function parseYearMonth(date: string): [number, number] {
  const [year, month] = date.split('-').map(Number)
  return [year, month]
}

// The charge date of one month: dayOfMonth, clamped to the month's last day.
// The 31st becomes the 28th or 29th in February. Each month is anchored on
// dayOfMonth, so a short month never moves the months after it.
export function getScheduledDate(year: number, month: number, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, getDaysInMonth(year, month))
  return `${year}-${pad(month)}-${pad(day)}`
}

// The version in force on a date: the latest term whose effectiveFrom is on or
// before that date. Null before the first version.
export function getTermInForce(terms: RecurringTerm[], date: string): RecurringTerm | null {
  let inForce: RecurringTerm | null = null

  for (const term of terms) {
    if (term.effectiveFrom <= date && (inForce === null || term.effectiveFrom > inForce.effectiveFrom)) {
      inForce = term
    }
  }

  return inForce
}

// The term that describes the template "right now", for display and as the
// edit form's starting values: the one in force today, or - before a
// brand-new template's first charge, since create_recurring_expense never
// backfills and sets its only term's effectiveFrom to tomorrow - the
// earliest term, because nothing has applied yet but it's still what the
// template says. getTermInForce alone is for a specific historical date
// (what the posting job and the rollup math need); this is for "now."
export function getCurrentTerm(terms: RecurringTerm[], today: string): RecurringTerm | null {
  const inForce = getTermInForce(terms, today)
  if (inForce) return inForce
  if (terms.length === 0) return null

  return [...terms].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]
}

// The soonest term after whichever one getCurrentTerm resolved to - a real
// price change still to come. Takes currentTerm, not today: a brand-new
// template's only term can itself have effectiveFrom after today (nothing
// has applied yet, getCurrentTerm falls back to it), and that term must
// never be echoed back here as if it were a separate pending change.
export function getNextTerm(terms: RecurringTerm[], currentTerm: RecurringTerm | null): RecurringTerm | null {
  if (!currentTerm) return null

  const upcoming = terms.filter((term) => term.effectiveFrom > currentTerm.effectiveFrom)
  if (upcoming.length === 0) return null

  return [...upcoming].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))[0]
}

// Every scheduled date from startOn through the earlier of asOf and endedOn,
// in order. A date before startOn is not charged, and a date after endedOn
// never is.
export function getScheduledDatesThrough(schedule: RecurringSchedule, asOf: string): string[] {
  const last = schedule.endedOn !== null && schedule.endedOn < asOf ? schedule.endedOn : asOf
  const dates: string[] = []
  const [lastYear, lastMonth] = parseYearMonth(last)
  let [year, month] = parseYearMonth(schedule.startOn)

  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const date = getScheduledDate(year, month, schedule.dayOfMonth)
    if (date >= schedule.startOn && date <= last) dates.push(date)
    ;[year, month] = nextMonth(year, month)
  }

  return dates
}

// The next `count` scheduled dates from today on, each with the term in force
// on that date. A display list only: the totals never include it (ADR-012,
// decision 11).
export function getUpcomingCharges(
  schedule: RecurringSchedule,
  terms: RecurringTerm[],
  today: string,
  count: number
): UpcomingCharge[] {
  const charges: UpcomingCharge[] = []
  if (terms.length === 0) return charges

  const from = schedule.startOn > today ? schedule.startOn : today
  let [year, month] = parseYearMonth(from)

  for (let scanned = 0; charges.length < count && scanned < MAX_SCAN_MONTHS; scanned++) {
    const date = getScheduledDate(year, month, schedule.dayOfMonth)
    if (schedule.endedOn !== null && date > schedule.endedOn) break

    const term = date >= from ? getTermInForce(terms, date) : null
    if (term !== null) charges.push({ date, term })

    ;[year, month] = nextMonth(year, month)
  }

  return charges
}

// The instant from which the posting job can post a charge: the first hourly
// run after 00:00 UTC of the day after the scheduled date. In Mexico City
// (UTC-6, no daylight saving time) that is 18:00 on the scheduled date, so a
// charge is never shown before its own day (ADR-012, decision 12).
export function getPostingAvailableAt(scheduledDate: string): string {
  const next = new Date(`${scheduledDate}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

function addDays(date: string, delta: number): string {
  const result = new Date(`${date}T00:00:00Z`)
  result.setUTCDate(result.getUTCDate() + delta)
  return result.toISOString().slice(0, 10)
}

// A scheduled date is due once `post_my_recurring_expenses` would post it (its
// cutoff is today - 1, the same one the UI's "post now" action calls) but has
// no occurrence with a transaction yet. This is the overdue state ADR-012's
// decision 1 shows when pg_cron did not resume after a pause: a due date the
// cron should already have posted and did not.
export function getOverdueDates(schedule: RecurringSchedule, postedDates: string[], today: string): string[] {
  const cutoff = addDays(today, -1)
  const posted = new Set(postedDates)
  return getScheduledDatesThrough(schedule, cutoff).filter((date) => !posted.has(date))
}
