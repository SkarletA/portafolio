import { describe, expect, it } from 'vitest'
import {
  getCurrentTerm,
  getNextTerm,
  getOverdueDates,
  getPostingAvailableAt,
  getScheduledDate,
  getScheduledDatesThrough,
  getTermInForce,
  getUpcomingCharges,
  type RecurringSchedule,
  type RecurringTerm,
} from '@domain/recurring'

const term = (effectiveFrom: string, amount: number): RecurringTerm => ({
  effectiveFrom,
  description: 'Streaming',
  amount,
  categoryId: null,
  paymentMethod: 'card',
  isShared: false,
  ownerShareAmount: null,
})

describe('getScheduledDate', () => {
  it('uses the configured day in a month that has it', () => {
    expect(getScheduledDate(2026, 10, 15)).toBe('2026-10-15')
  })

  it('clamps the 31st to the last day of a 30-day month', () => {
    expect(getScheduledDate(2026, 4, 31)).toBe('2026-04-30')
  })

  it('clamps the 31st to 28 February and 29 February in a leap year', () => {
    expect(getScheduledDate(2026, 2, 31)).toBe('2026-02-28')
    expect(getScheduledDate(2028, 2, 31)).toBe('2028-02-29')
  })
})

describe('getScheduledDatesThrough', () => {
  it('returns the 31st on the 31st again in March after a clamped February', () => {
    const dates = getScheduledDatesThrough({ startOn: '2026-01-31', endedOn: null, dayOfMonth: 31 }, '2026-04-30')

    expect(dates).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('skips the dates of the start month that fall before startOn', () => {
    const dates = getScheduledDatesThrough({ startOn: '2026-09-15', endedOn: null, dayOfMonth: 10 }, '2026-10-31')

    expect(dates).toEqual(['2026-10-10'])
  })

  it('returns nothing before the first scheduled date', () => {
    expect(getScheduledDatesThrough({ startOn: '2026-09-15', endedOn: null, dayOfMonth: 10 }, '2026-10-09')).toEqual([])
  })

  it('stops at endedOn, and never charges after it', () => {
    const dates = getScheduledDatesThrough({ startOn: '2026-09-01', endedOn: '2026-11-05', dayOfMonth: 10 }, '2026-12-31')

    expect(dates).toEqual(['2026-09-10', '2026-10-10'])
  })

  it('crosses the year boundary for a 31st that starts in December', () => {
    const dates = getScheduledDatesThrough({ startOn: '2026-12-31', endedOn: null, dayOfMonth: 31 }, '2027-02-28')

    expect(dates).toEqual(['2026-12-31', '2027-01-31', '2027-02-28'])
  })
})

describe('getTermInForce', () => {
  const terms = [term('2026-01-01', 100), term('2026-06-01', 150)]

  it('returns the version whose effectiveFrom is on or before the date', () => {
    expect(getTermInForce(terms, '2026-05-31')?.amount).toBe(100)
    expect(getTermInForce(terms, '2026-06-01')?.amount).toBe(150)
  })

  it('returns null before the first version', () => {
    expect(getTermInForce(terms, '2025-12-31')).toBeNull()
  })

  it('finds the latest version even when the terms are not sorted', () => {
    expect(getTermInForce([term('2026-06-01', 150), term('2026-01-01', 100)], '2026-07-01')?.amount).toBe(150)
  })
})

describe('getCurrentTerm', () => {
  it('matches getTermInForce once a term is actually in force', () => {
    const terms = [term('2026-01-01', 100), term('2026-06-01', 150)]
    expect(getCurrentTerm(terms, '2026-06-01')?.amount).toBe(150)
  })

  // create_recurring_expense never backfills: a brand-new template's only term
  // has effectiveFrom = today + 1, so on creation day nothing is in force yet.
  // The card and the edit form must still show that term, not blank fields.
  it('falls back to the only term on the day the template was created, before its first charge', () => {
    const terms = [term('2026-10-07', 199)]
    expect(getCurrentTerm(terms, '2026-10-06')?.amount).toBe(199)
  })

  it('falls back to the earliest term when several are all still in the future', () => {
    const terms = [term('2026-11-01', 250), term('2026-10-07', 199)]
    expect(getCurrentTerm(terms, '2026-10-06')?.amount).toBe(199)
  })

  it('returns null for a template with no terms at all', () => {
    expect(getCurrentTerm([], '2026-10-06')).toBeNull()
  })
})

describe('getNextTerm', () => {
  it('returns null when there is no term after the current one', () => {
    const current = term('2026-08-15', 199)
    expect(getNextTerm([current], current)).toBeNull()
  })

  it('returns the soonest term after the current one', () => {
    const current = term('2026-08-15', 199)
    const terms = [current, term('2026-11-01', 249)]
    expect(getNextTerm(terms, current)?.amount).toBe(249)
  })

  it('picks the soonest of several terms after the current one, not the latest', () => {
    const current = term('2026-08-15', 199)
    const terms = [current, term('2027-01-01', 299), term('2026-11-01', 249)]
    expect(getNextTerm(terms, current)?.amount).toBe(249)
  })

  // The exact bug reported: a brand-new template's only term has
  // effectiveFrom after today (create_recurring_expense never backfills),
  // so getCurrentTerm falls back to it (ADR-012). getNextTerm must not echo
  // that same term back as if it were a separate pending price change.
  it('never returns the current term itself, even when nothing has applied yet', () => {
    const onlyTerm = term('2026-10-12', 299)
    expect(getNextTerm([onlyTerm], onlyTerm)).toBeNull()
  })

  it('returns null when there is no current term to compare against', () => {
    expect(getNextTerm([], null)).toBeNull()
  })
})

describe('getUpcomingCharges', () => {
  const schedule = { startOn: '2026-10-07', endedOn: null, dayOfMonth: 15 }
  const terms = [term('2026-10-07', 100)]

  it('lists the next scheduled dates from today on', () => {
    const charges = getUpcomingCharges(schedule, terms, '2026-10-06', 2)

    expect(charges.map((charge) => charge.date)).toEqual(['2026-10-15', '2026-11-15'])
    expect(charges[0].term.amount).toBe(100)
  })

  it('skips a date that has already passed this month', () => {
    const charges = getUpcomingCharges(schedule, terms, '2026-10-20', 1)

    expect(charges.map((charge) => charge.date)).toEqual(['2026-11-15'])
  })

  it('stops at endedOn', () => {
    const charges = getUpcomingCharges({ ...schedule, endedOn: '2026-10-31' }, terms, '2026-10-06', 5)

    expect(charges.map((charge) => charge.date)).toEqual(['2026-10-15'])
  })

  it('uses the term in force on each date', () => {
    const charges = getUpcomingCharges(
      schedule,
      [term('2026-10-07', 100), term('2026-11-01', 120)],
      '2026-10-06',
      2
    )

    expect(charges.map((charge) => charge.term.amount)).toEqual([100, 120])
  })

  it('returns nothing when there are no terms', () => {
    expect(getUpcomingCharges(schedule, [], '2026-10-06', 3)).toEqual([])
  })
})

describe('getPostingAvailableAt', () => {
  it('is 18:00 on the scheduled date in Mexico City, which is 00:00 UTC the next day', () => {
    expect(getPostingAvailableAt('2026-09-30')).toBe('2026-10-01T00:00:00.000Z')
  })

  it('crosses the year boundary', () => {
    expect(getPostingAvailableAt('2026-12-31')).toBe('2027-01-01T00:00:00.000Z')
  })
})

describe('getOverdueDates', () => {
  const schedule: RecurringSchedule = { startOn: '2026-07-15', endedOn: null, dayOfMonth: 15 }

  it('returns nothing when every due date has posted', () => {
    const posted = ['2026-07-15', '2026-08-15', '2026-09-15']
    expect(getOverdueDates(schedule, posted, '2026-10-06')).toEqual([])
  })

  it('flags a due date with no occurrence, as if a paused cron had not resumed', () => {
    const posted = ['2026-07-15', '2026-09-15']
    expect(getOverdueDates(schedule, posted, '2026-10-06')).toEqual(['2026-08-15'])
  })

  it('does not count today as overdue - it still waits for the scheduled run', () => {
    expect(getOverdueDates(schedule, [], '2026-07-15')).toEqual([])
  })

  it('counts yesterday as overdue once nothing has posted for it', () => {
    expect(getOverdueDates(schedule, [], '2026-08-16')).toEqual(['2026-07-15', '2026-08-15'])
  })
})
