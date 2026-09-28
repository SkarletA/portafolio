import { describe, expect, it } from 'vitest'
import {
  fitsRefundableRemaining,
  getRefundableRemaining,
  MAX_REFUNDABLE_PURCHASES,
  selectRefundablePurchases,
  summarizeRefundsByPurchase,
} from './refund'

describe('summarizeRefundsByPurchase', () => {
  it('counts and adds exactly the reimbursements linked to each purchase', () => {
    expect(
      summarizeRefundsByPurchase([
        { amount: 0.1, refunds_transaction_id: 'p1' },
        { amount: 0.2, refunds_transaction_id: 'p1' },
        { amount: 50, refunds_transaction_id: 'p2' },
      ])
    ).toEqual({ p1: { count: 2, total: 0.3 }, p2: { count: 1, total: 50 } })
  })

  it('ignores rows with no link', () => {
    expect(summarizeRefundsByPurchase([{ amount: 80, refunds_transaction_id: null }])).toEqual({})
  })
})

describe('getRefundableRemaining', () => {
  it('subtracts what is already refunded, exactly', () => {
    expect(getRefundableRemaining(1, 0.7)).toBe(0.3)
    expect(getRefundableRemaining(100, 0)).toBe(100)
  })

  it('does not count the stored amount of the reimbursement being edited', () => {
    expect(getRefundableRemaining(100, 60, 60)).toBe(100)
    expect(getRefundableRemaining(100, 90, 30)).toBe(40)
  })
})

describe('fitsRefundableRemaining', () => {
  it('compares in cents, allowing exactly what remains', () => {
    expect(fitsRefundableRemaining(0.3, 0.3)).toBe(true)
    expect(fitsRefundableRemaining(0.31, 0.3)).toBe(false)
  })

  it('never fits an amount with more than 2 decimals, without throwing', () => {
    expect(fitsRefundableRemaining(10.005, 100)).toBe(false)
  })
})

describe('selectRefundablePurchases', () => {
  const purchase = (id: string, date: string, amount = 100, category_id: string | null = 'food') => ({
    id,
    type: 'expense' as const,
    amount,
    date,
    category_id,
  })
  const options = { refundDate: '2026-09-30', currentPurchaseId: null, ownRefundAmount: 0 }

  it('offers expenses with a category and something left, newest first, with their remaining amount', () => {
    const purchases = [
      purchase('old', '2026-08-01'),
      purchase('new', '2026-09-10', 100),
      purchase('used-up', '2026-09-01', 100),
      purchase('no-category', '2026-09-02', 100, null),
      { ...purchase('income', '2026-09-03'), type: 'income' as const },
    ]
    const refunds = { new: { count: 1, total: 30 }, 'used-up': { count: 2, total: 100 } }

    expect(selectRefundablePurchases(purchases, refunds, options).map(({ id, remaining }) => [id, remaining])).toEqual([
      ['new', 70],
      ['old', 100],
    ])
  })

  it('leaves out purchases dated after the reimbursement, but not while its date is unset', () => {
    const purchases = [purchase('later', '2026-10-05'), purchase('earlier', '2026-09-05')]

    expect(selectRefundablePurchases(purchases, {}, options).map(({ id }) => id)).toEqual(['earlier'])
    expect(selectRefundablePurchases(purchases, {}, { ...options, refundDate: null }).map(({ id }) => id)).toEqual([
      'later',
      'earlier',
    ])
  })

  it('keeps offering the purchase an edited reimbursement is linked to, even if it uses up what remains', () => {
    const purchases = [purchase('linked', '2026-09-01', 100)]
    const refunds = { linked: { count: 1, total: 100 } }

    expect(
      selectRefundablePurchases(purchases, refunds, { refundDate: '2026-09-30', currentPurchaseId: 'linked', ownRefundAmount: 100 })
    ).toEqual([{ ...purchases[0], remaining: 100 }])
  })

  it('caps the list, but never drops the purchase being edited', () => {
    const many = Array.from({ length: MAX_REFUNDABLE_PURCHASES + 5 }, (_, index) =>
      purchase(`p${index}`, `2026-09-${String(28 - (index % 28)).padStart(2, '0')}`)
    )
    const oldest = { ...purchase('oldest', '2020-01-01') }

    const offered = selectRefundablePurchases([...many, oldest], {}, { ...options, currentPurchaseId: 'oldest' })

    expect(offered).toHaveLength(MAX_REFUNDABLE_PURCHASES + 1)
    expect(offered.some(({ id }) => id === 'oldest')).toBe(true)
  })
})
