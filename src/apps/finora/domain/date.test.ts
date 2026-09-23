import { describe, expect, it } from 'vitest'
import { getTodayLocalDate } from './date'

describe('getTodayLocalDate', () => {
  it('formats the local calendar date as YYYY-MM-DD, zero-padded', () => {
    expect(getTodayLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(getTodayLocalDate(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})
