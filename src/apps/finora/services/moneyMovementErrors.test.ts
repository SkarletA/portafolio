import { describe, expect, it } from 'vitest'
import { parseMoneyMovementError } from './moneyMovementErrors'

describe('parseMoneyMovementError', () => {
  it('reads the insufficient funds code with the available balance', () => {
    expect(parseMoneyMovementError({ code: 'P0001', message: 'insufficient_goal_funds', details: '5200.00' })).toEqual({
      code: 'insufficient_goal_funds',
      available: 5200,
    })
  })

  it('reads codes that carry no amount', () => {
    expect(parseMoneyMovementError({ code: 'P0001', message: 'goal_balance_negative', details: 'some-goal-id' })).toEqual({
      code: 'goal_balance_negative',
      available: null,
    })
    expect(parseMoneyMovementError({ code: 'P0001', message: 'goal_not_found' })).toEqual({
      code: 'goal_not_found',
      available: null,
    })
  })

  it('ignores other errors, including unknown raised messages', () => {
    expect(parseMoneyMovementError(null)).toBeNull()
    expect(parseMoneyMovementError({ code: '23505', message: 'duplicate key value' })).toBeNull()
    expect(parseMoneyMovementError({ code: 'P0001', message: 'something_else' })).toBeNull()
  })
})
