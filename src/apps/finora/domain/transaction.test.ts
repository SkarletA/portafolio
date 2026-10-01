import { describe, expect, it } from 'vitest'
import { getHouseholdAttributedAmount, getPrimaryPaymentMethod } from './transaction'

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

describe('getHouseholdAttributedAmount', () => {
  const baseTransaction = {
    user_id: 'owner',
    amount: 100,
    is_shared: false,
    is_household_expense: false,
    shares: [],
  }

  it('attributes a split (Case A) to each member by their own share, not the full amount', () => {
    const transaction = {
      ...baseTransaction,
      is_shared: true,
      amount: 250,
      shares: [
        { user_id: 'owner', amount: 150 },
        { user_id: 'partner', amount: 100 },
      ],
    }

    expect(getHouseholdAttributedAmount(transaction, 'owner')).toBe(150)
    expect(getHouseholdAttributedAmount(transaction, 'partner')).toBe(100)
  })

  it('attributes a household-tagged expense (Case B) in full to the member who recorded it', () => {
    const transaction = { ...baseTransaction, is_household_expense: true, user_id: 'owner', amount: 250 }

    expect(getHouseholdAttributedAmount(transaction, 'owner')).toBe(250)
  })

  it('attributes nothing from a Case B expense to the other member - it was never split', () => {
    const transaction = { ...baseTransaction, is_household_expense: true, user_id: 'owner', amount: 250 }

    expect(getHouseholdAttributedAmount(transaction, 'partner')).toBe(0)
  })

  it('attributes nothing from an untagged, purely personal expense', () => {
    expect(getHouseholdAttributedAmount(baseTransaction, 'owner')).toBe(0)
  })

  it('attributes nothing to a member with no share on a split', () => {
    const transaction = {
      ...baseTransaction,
      is_shared: true,
      shares: [{ user_id: 'owner', amount: 150 }],
    }

    expect(getHouseholdAttributedAmount(transaction, 'partner')).toBe(0)
  })
})
