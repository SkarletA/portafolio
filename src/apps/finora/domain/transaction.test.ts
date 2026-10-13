import { describe, expect, it } from 'vitest'
import { getAvailableMonths, getHouseholdAttributedAmount, getOwnAttributedAmount, getPrimaryPaymentMethod } from './transaction'
import { addMoney } from './money'

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

describe('getOwnAttributedAmount', () => {
  const baseTransaction = {
    user_id: 'owner',
    amount: 100,
    is_shared: false,
    is_household_expense: false,
    shares: [],
  }

  it("counts an unshared expense in full for its owner - unlike getHouseholdAttributedAmount's tagged-only 0", () => {
    expect(getOwnAttributedAmount(baseTransaction, 'owner')).toBe(100)
  })

  it('counts nothing from an unshared expense for the other member', () => {
    expect(getOwnAttributedAmount(baseTransaction, 'partner')).toBe(0)
  })

  it('counts a Case A share, not the full amount, for whoever recorded it', () => {
    const transaction = {
      ...baseTransaction,
      is_shared: true,
      amount: 250,
      shares: [
        { user_id: 'owner', amount: 150 },
        { user_id: 'partner', amount: 100 },
      ],
    }

    expect(getOwnAttributedAmount(transaction, 'owner')).toBe(150)
  })

  it("counts a Case A share for the member who didn't record it, reading the row they never wrote", () => {
    const transaction = {
      ...baseTransaction,
      user_id: 'owner',
      is_shared: true,
      amount: 250,
      shares: [
        { user_id: 'owner', amount: 150 },
        { user_id: 'partner', amount: 100 },
      ],
    }

    expect(getOwnAttributedAmount(transaction, 'partner')).toBe(100)
  })

  it('counts a Case B household-tagged expense in full for its owner, 0 for the other member - unaffected by this revision', () => {
    const transaction = { ...baseTransaction, is_household_expense: true, amount: 250 }

    expect(getOwnAttributedAmount(transaction, 'owner')).toBe(250)
    expect(getOwnAttributedAmount(transaction, 'partner')).toBe(0)
  })

  // The individual-view invariant this ADR-009 revision relies on: summing
  // both household members' own-attributed amount for any single
  // transaction always recovers that transaction's own amount, whatever its
  // case - so summing every transaction's own-attributed amount over a
  // range, for both members, always recovers the household-combined
  // (full-visibility) total for that same range (ADR-011, unchanged).
  describe('invariant: both members\' own-attributed amount sums to the transaction\'s own amount', () => {
    const assertInvariantHolds = (transaction: {
      user_id: string
      amount: number
      is_shared: boolean
      is_household_expense: boolean
      shares: { user_id: string; amount: number }[]
    }) => {
      expect(addMoney(getOwnAttributedAmount(transaction, 'owner'), getOwnAttributedAmount(transaction, 'partner'))).toBe(
        transaction.amount
      )
    }

    it('holds for an unshared personal expense', () => {
      assertInvariantHolds(baseTransaction)
    })

    it('holds for a Case A split, cents-exact', () => {
      assertInvariantHolds({
        ...baseTransaction,
        is_shared: true,
        amount: 152.37,
        shares: [
          { user_id: 'owner', amount: 52.37 },
          { user_id: 'partner', amount: 100 },
        ],
      })
    })

    it('holds for a Case B household-tagged expense', () => {
      assertInvariantHolds({ ...baseTransaction, is_household_expense: true, amount: 250 })
    })
  })
})

describe('getAvailableMonths', () => {
  it('returns an empty list with no transactions', () => {
    expect(getAvailableMonths([])).toEqual([])
  })

  it('returns each distinct year-month, newest first', () => {
    const transactions = [{ date: '2026-08-05' }, { date: '2026-09-01' }, { date: '2026-08-20' }]

    expect(getAvailableMonths(transactions)).toEqual(['2026-09', '2026-08'])
  })

  it('does not repeat a month with more than one transaction in it', () => {
    const transactions = [{ date: '2026-09-01' }, { date: '2026-09-28' }]

    expect(getAvailableMonths(transactions)).toEqual(['2026-09'])
  })
})
