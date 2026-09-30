import { describe, expect, it } from 'vitest'
import { isLinkedRefundsViolation, parseMoneyMovementError, PurchaseHasLinkedRefundsError } from './moneyMovementErrors'

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

  it.each([
    'invalid_refund_link',
    'refund_category_mismatch',
    'refund_before_purchase',
    'purchase_has_linked_refunds',
  ])('reads the refund link code %s', (code) => {
    expect(parseMoneyMovementError({ code: 'P0001', message: code })).toEqual({ code, available: null })
  })

  it.each([
    'invalid_share_plan',
    'household_required_for_shared_expense',
    'invalid_share_recipient',
    'shares_do_not_match_amount',
  ])('reads the shared expense code %s', (code) => {
    expect(parseMoneyMovementError({ code: 'P0001', message: code })).toEqual({ code, available: null })
  })

  it('reads how much can still be refunded from refund_exceeds_purchase', () => {
    expect(parseMoneyMovementError({ code: 'P0001', message: 'refund_exceeds_purchase', details: '70.00' })).toEqual({
      code: 'refund_exceeds_purchase',
      available: 70,
    })
  })

  it('ignores other errors, including unknown raised messages', () => {
    expect(parseMoneyMovementError(null)).toBeNull()
    expect(parseMoneyMovementError({ code: '23505', message: 'duplicate key value' })).toBeNull()
    expect(parseMoneyMovementError({ code: 'P0001', message: 'something_else' })).toBeNull()
  })
})

describe('isLinkedRefundsViolation', () => {
  const message =
    'update or delete on table "transactions" violates foreign key constraint "transactions_refunds_transaction_id_fkey" on table "transactions"'

  it('recognizes the foreign key violation of deleting a purchase with linked reimbursements', () => {
    expect(isLinkedRefundsViolation({ code: '23503', message })).toBe(true)
  })

  it('does not mistake another foreign key violation for it', () => {
    expect(
      isLinkedRefundsViolation({
        code: '23503',
        message: 'update or delete on table "goals" violates foreign key constraint "goal_transfers_goal_id_fkey"',
      })
    ).toBe(false)
    expect(isLinkedRefundsViolation({ code: 'P0001', message })).toBe(false)
    expect(isLinkedRefundsViolation(null)).toBe(false)
  })
})

describe('PurchaseHasLinkedRefundsError', () => {
  it('carries the reimbursements that block the delete', () => {
    const refunds = [{ id: 'r1', description: 'Store refund', amount: 30, date: '2026-09-12' }]
    const error = new PurchaseHasLinkedRefundsError(refunds)

    expect(error).toBeInstanceOf(Error)
    expect(error.refunds).toEqual(refunds)
  })
})
