import { describe, expect, it } from 'vitest'
import { getLocalCalendarDate, getTodayLocalDate } from './date'

describe('getTodayLocalDate', () => {
  it('formats the local calendar date as YYYY-MM-DD, zero-padded', () => {
    expect(getTodayLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(getTodayLocalDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})

describe('getLocalCalendarDate', () => {
  it('returns UTC midnight of the local calendar day', () => {
    expect(getLocalCalendarDate(new Date(2026, 8, 30, 23, 59)).toISOString()).toBe('2026-09-30T00:00:00.000Z')
    expect(getLocalCalendarDate(new Date(2026, 0, 1, 0, 0)).toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })
})
