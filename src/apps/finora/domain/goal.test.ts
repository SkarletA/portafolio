import { describe, expect, it } from 'vitest'
import { getGoalProgress } from './goal'

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
