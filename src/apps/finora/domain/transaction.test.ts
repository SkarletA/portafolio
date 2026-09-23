import { describe, expect, it } from 'vitest'
import { getPrimaryPaymentMethod } from './transaction'

describe('getPrimaryPaymentMethod', () => {
  it('returns an empty string when there are no payments', () => {
    expect(getPrimaryPaymentMethod([])).toBe('')
  })

  it('returns the only method when there is a single payment', () => {
    expect(getPrimaryPaymentMethod([{ payment_method: 'Bank Transfer', amount: 1500 }])).toBe('Bank Transfer')
  })

  it('returns the method with the largest amount', () => {
    expect(
      getPrimaryPaymentMethod([
        { payment_method: 'Cash', amount: 200 },
        { payment_method: 'Bank Transfer', amount: 1300 },
        { payment_method: 'Grocery Vouchers', amount: 500 },
      ])
    ).toBe('Bank Transfer')
  })

  it('keeps the first recorded method when amounts tie', () => {
    expect(
      getPrimaryPaymentMethod([
        { payment_method: 'Cash', amount: 500 },
        { payment_method: 'Debit Card', amount: 500 },
      ])
    ).toBe('Cash')
  })
})
