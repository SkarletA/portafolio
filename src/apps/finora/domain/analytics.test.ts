import { describe, expect, it } from 'vitest'
import { getAveragePerDay, getCategoryPercentage, getPercentChange, getPeriodRange, getSavingsRate } from './analytics'

describe('getSavingsRate', () => {
  it('computes the percentage of income not spent', () => {
    expect(getSavingsRate(1000, 720)).toBeCloseTo(28)
  })

  it('returns 0 when there is no income to guard against division by zero', () => {
    expect(getSavingsRate(0, 200)).toBe(0)
  })

  it('can be negative when spend exceeds income', () => {
    expect(getSavingsRate(1000, 1500)).toBe(-50)
  })
})

describe('getAveragePerDay', () => {
  it('divides total spend by the elapsed days', () => {
    expect(getAveragePerDay(300, 10)).toBe(30)
  })

  it('returns 0 when no days have elapsed to guard against division by zero', () => {
    expect(getAveragePerDay(300, 0)).toBe(0)
  })
})

describe('getCategoryPercentage', () => {
  it('computes the share of a category over the total', () => {
    expect(getCategoryPercentage(250, 1000)).toBe(25)
  })

  it('returns 0 when the total is 0 to guard against division by zero', () => {
    expect(getCategoryPercentage(50, 0)).toBe(0)
  })
})

describe('getPeriodRange', () => {
  it('returns the current and previous day for periodType day', () => {
    const { current, previous } = getPeriodRange('day', new Date(Date.UTC(2026, 8, 11)))
    expect(current).toEqual({ start: '2026-09-11', end: '2026-09-11' })
    expect(previous).toEqual({ start: '2026-09-10', end: '2026-09-10' })
  })

  it('rolls a day range back across a month boundary', () => {
    const { previous } = getPeriodRange('day', new Date(Date.UTC(2026, 8, 1)))
    expect(previous).toEqual({ start: '2026-08-31', end: '2026-08-31' })
  })

  it('returns the current and previous calendar month for periodType month', () => {
    const { current, previous } = getPeriodRange('month', new Date(Date.UTC(2026, 8, 15)))
    expect(current).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(previous).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })

  it('rolls a month range back across a year boundary', () => {
    const { previous } = getPeriodRange('month', new Date(Date.UTC(2026, 0, 15)))
    expect(previous).toEqual({ start: '2025-12-01', end: '2025-12-31' })
  })

  it('returns the current and previous calendar year for periodType year', () => {
    const { current, previous } = getPeriodRange('year', new Date(Date.UTC(2026, 8, 15)))
    expect(current).toEqual({ start: '2026-01-01', end: '2026-12-31' })
    expect(previous).toEqual({ start: '2025-01-01', end: '2025-12-31' })
  })
})

describe('getPercentChange', () => {
  it('computes the percentage change between two values', () => {
    expect(getPercentChange(118, 100)).toBeCloseTo(18)
  })

  it('computes a negative change when the value decreased', () => {
    expect(getPercentChange(80, 100)).toBeCloseTo(-20)
  })

  it('returns 0 when both current and previous are 0', () => {
    expect(getPercentChange(0, 0)).toBe(0)
  })

  it('returns null when previous is 0 but current is not, since there is no baseline', () => {
    expect(getPercentChange(50, 0)).toBeNull()
  })
})
