import { describe, expect, it } from 'vitest'
import { getAvailableForExpense, getGoalProgress } from './goal'

describe('getGoalProgress', () => {
  it('computes percentage and remaining toward the target', () => {
    expect(getGoalProgress(3500, 5000)).toEqual({ percentage: 70, remaining: 1500 })
  })

  it('returns 0 progress and 0 remaining when the target is 0 and nothing was saved', () => {
    expect(getGoalProgress(0, 0)).toEqual({ percentage: 0, remaining: 0 })
  })

  it('guards against a 0 target with existing savings by treating it as complete', () => {
    expect(getGoalProgress(200, 0)).toEqual({ percentage: 100, remaining: 0 })
  })

  it('never returns negative remaining when current exceeds target', () => {
    expect(getGoalProgress(6000, 5000)).toEqual({ percentage: 120, remaining: 0 })
  })
})

describe('getAvailableForExpense', () => {
  const vacation = { id: 'vacation', current_amount: 5200 }

  it('is the goal balance for a new expense', () => {
    expect(getAvailableForExpense(vacation, null)).toBe(5200)
  })

  it('adds back the expense\'s own withdrawal from the same goal, which is returned on save', () => {
    expect(getAvailableForExpense(vacation, { goal_id: 'vacation', amount: 1000 })).toBe(6200)
  })

  it('ignores a withdrawal from a different goal', () => {
    expect(getAvailableForExpense(vacation, { goal_id: 'emergency', amount: 1000 })).toBe(5200)
  })

  it('adds in cents, without floating-point noise', () => {
    // 0.1 + 0.2 === 0.30000000000000004
    expect(getAvailableForExpense({ id: 'g', current_amount: 0.1 }, { goal_id: 'g', amount: 0.2 })).toBe(0.3)
  })
})

describe('getGoalProgress remaining', () => {
  it('is the exact difference where float subtraction leaves noise', () => {
    expect(0.3 - 0.1).not.toBe(0.2)
    expect(getGoalProgress(0.1, 0.3).remaining).toBe(0.2)
  })

  it('is 0 once the goal is reached or exceeded', () => {
    expect(getGoalProgress(0.3, 0.3).remaining).toBe(0)
    expect(getGoalProgress(500.75, 500).remaining).toBe(0)
  })
})
