import { describe, expect, it } from 'vitest'
import { getAveragePerDay, getCategoryPercentage, getSavingsRate } from './analytics'

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
