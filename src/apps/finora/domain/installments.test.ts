import { describe, expect, it } from 'vitest'
import {
  allocateInstallments,
  expandLedgerRowsInRange,
  getInstallmentDate,
  getPaymentPlanErrors,
  isIncomeFundedExpense,
  toMinorUnits,
  type PaymentPlan,
} from './installments'

function sumInCents(amounts: number[]) {
  return amounts.reduce((sum, amount) => sum + toMinorUnits(amount), 0)
}

describe('toMinorUnits', () => {
  it('converts amounts with up to 2 decimals to exact cents', () => {
    expect(toMinorUnits(20000)).toBe(2000000)
    expect(toMinorUnits(1666.67)).toBe(166667)
    expect(toMinorUnits(19.9)).toBe(1990)
    expect(toMinorUnits(0.05)).toBe(5)
    expect(toMinorUnits(0)).toBe(0)
    expect(toMinorUnits(-12.5)).toBe(-1250)
  })

  it('is exact where floating-point multiplication is not', () => {
    // 1.1 * 100 === 110.00000000000001 and 0.29 * 100 === 28.999999999999996
    expect(toMinorUnits(1.1)).toBe(110)
    expect(toMinorUnits(0.29)).toBe(29)
  })

  it('rejects instead of rounding amounts with more than 2 decimals', () => {
    expect(() => toMinorUnits(10.005)).toThrow(RangeError)
    expect(() => toMinorUnits(1.005)).toThrow(RangeError)
  })

  it('rejects non-finite and unsafe amounts', () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow(RangeError)
    expect(() => toMinorUnits(Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => toMinorUnits(1e21)).toThrow(RangeError)
    expect(() => toMinorUnits(Number.MAX_SAFE_INTEGER)).toThrow(RangeError)
  })
})

describe('allocateInstallments', () => {
  it('splits $20,000 over 12 months with the leftover cents on the first installments', () => {
    const installments = allocateInstallments(20000, 12)

    expect(installments).toEqual([...Array(8).fill(1666.67), ...Array(4).fill(1666.66)])
    expect(sumInCents(installments)).toBe(toMinorUnits(20000))
  })

  it('keeps every installment within one cent of the others', () => {
    expect(allocateInstallments(100, 3)).toEqual([33.34, 33.33, 33.33])
  })

  it('splits evenly when the amount divides exactly', () => {
    expect(allocateInstallments(1200, 12)).toEqual(Array(12).fill(100))
  })

  it('gives zero-cent installments when there are fewer cents than months', () => {
    expect(allocateInstallments(0.05, 12)).toEqual([...Array(5).fill(0.01), ...Array(7).fill(0)])
  })

  it('always adds up to exactly the amount', () => {
    const cases: [number, number][] = [
      [20000, 12],
      [999.99, 7],
      [0.1, 3],
      [12345.67, 48],
      [1, 6],
    ]

    for (const [amount, months] of cases) {
      const installments = allocateInstallments(amount, months)
      expect(installments).toHaveLength(months)
      expect(sumInCents(installments)).toBe(toMinorUnits(amount))
    }
  })

  it('returns a single installment untouched, without converting to cents', () => {
    expect(allocateInstallments(20000, 1)).toEqual([20000])
    // Legacy rows may have more than 2 decimals; they must not start failing.
    expect(allocateInstallments(10.005, 1)).toEqual([10.005])
  })

  it('rejects amounts it cannot split exactly', () => {
    expect(() => allocateInstallments(10.005, 3)).toThrow(RangeError)
  })

  it('rejects invalid months and negative amounts', () => {
    expect(() => allocateInstallments(100, 0)).toThrow(RangeError)
    expect(() => allocateInstallments(100, 1.5)).toThrow(RangeError)
    expect(() => allocateInstallments(100, -3)).toThrow(RangeError)
    expect(() => allocateInstallments(-100, 3)).toThrow(RangeError)
  })
})

describe('getInstallmentDate', () => {
  it('dates the first installment on the purchase date', () => {
    expect(getInstallmentDate('2026-09-23', 0)).toBe('2026-09-23')
  })

  it('moves forward by whole months on the same day', () => {
    expect(getInstallmentDate('2026-01-15', 1)).toBe('2026-02-15')
    expect(getInstallmentDate('2026-01-15', 11)).toBe('2026-12-15')
  })

  it('crosses into the next year', () => {
    expect(getInstallmentDate('2026-11-15', 3)).toBe('2027-02-15')
    expect(getInstallmentDate('2026-01-15', 24)).toBe('2028-01-15')
  })

  // Expected values are what Postgres returns for
  // `date + make_interval(months => index)`, which computes
  // `last_installment_date` - the JS schedule must match it.
  it('clamps to the last day of shorter months, counting from the purchase date', () => {
    expect(getInstallmentDate('2026-01-31', 1)).toBe('2026-02-28')
    expect(getInstallmentDate('2026-01-31', 2)).toBe('2026-03-31')
    expect(getInstallmentDate('2026-01-31', 3)).toBe('2026-04-30')
    expect(getInstallmentDate('2026-11-30', 3)).toBe('2027-02-28')
  })

  it('handles leap years', () => {
    expect(getInstallmentDate('2028-01-31', 1)).toBe('2028-02-29')
    expect(getInstallmentDate('2028-02-29', 12)).toBe('2029-02-28')
    expect(getInstallmentDate('2027-02-28', 12)).toBe('2028-02-28')
  })

  it('rejects dates that are malformed or do not exist', () => {
    expect(() => getInstallmentDate('2026-02-30', 1)).toThrow(RangeError)
    expect(() => getInstallmentDate('2026-13-01', 1)).toThrow(RangeError)
    expect(() => getInstallmentDate('2026-9-1', 1)).toThrow(RangeError)
    expect(() => getInstallmentDate('2026-09-23T00:00:00Z', 1)).toThrow(RangeError)
  })

  it('rejects invalid installment indexes', () => {
    expect(() => getInstallmentDate('2026-09-23', -1)).toThrow(RangeError)
    expect(() => getInstallmentDate('2026-09-23', 1.5)).toThrow(RangeError)
  })
})

describe('expandLedgerRowsInRange', () => {
  const september = { start: '2026-09-01', end: '2026-09-30' }

  const travel = {
    category_id: 'travel',
    type: 'expense' as const,
    date: '2026-01-15',
    amount: 20000,
    installment_months: 12,
  }

  it('passes a single-payment row through when its date is in range', () => {
    const groceries = { category_id: 'food', date: '2026-09-10', amount: 850.5, installment_months: 1 }

    expect(expandLedgerRowsInRange([groceries], september)).toEqual([groceries])
  })

  it('drops a single-payment row dated outside the range', () => {
    const rows = [{ date: '2026-08-31', amount: 100, installment_months: 1 }]

    expect(expandLedgerRowsInRange(rows, september)).toEqual([])
  })

  it('keeps only the installment of a financed purchase that falls in the range', () => {
    // $20,000 / 12 leaves 8 extra cents, carried by installments 0-7 (Jan-Aug).
    // August (index 7) is the last one with the extra cent; September
    // (index 8) is the first without it.
    const august = { start: '2026-08-01', end: '2026-08-31' }

    expect(expandLedgerRowsInRange([travel], august)).toEqual([{ ...travel, date: '2026-08-15', amount: 1666.67 }])
    expect(expandLedgerRowsInRange([travel], september)).toEqual([{ ...travel, date: '2026-09-15', amount: 1666.66 }])
  })

  it('returns nothing before the purchase or after the last installment', () => {
    expect(expandLedgerRowsInRange([travel], { start: '2025-12-01', end: '2025-12-31' })).toEqual([])
    expect(expandLedgerRowsInRange([travel], { start: '2027-01-01', end: '2027-01-31' })).toEqual([])
  })

  it('returns every installment in a range that covers the whole schedule, adding up to the total', () => {
    const installments = expandLedgerRowsInRange([travel], { start: '2026-01-01', end: '2026-12-31' })

    expect(installments.map((installment) => installment.date)).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
      '2026-05-15',
      '2026-06-15',
      '2026-07-15',
      '2026-08-15',
      '2026-09-15',
      '2026-10-15',
      '2026-11-15',
      '2026-12-15',
    ])
    expect(sumInCents(installments.map((installment) => installment.amount))).toBe(toMinorUnits(20000))
  })

  it('splits a schedule that crosses a year boundary between the two years', () => {
    const laptop = { date: '2026-11-30', amount: 3000, installment_months: 6 }

    const in2026 = expandLedgerRowsInRange([laptop], { start: '2026-01-01', end: '2026-12-31' })
    const in2027 = expandLedgerRowsInRange([laptop], { start: '2027-01-01', end: '2027-12-31' })

    expect(in2026.map((installment) => installment.date)).toEqual(['2026-11-30', '2026-12-30'])
    expect(in2027.map((installment) => installment.date)).toEqual([
      '2027-01-30',
      '2027-02-28',
      '2027-03-30',
      '2027-04-30',
    ])
  })

  it('treats both ends of the range as inclusive', () => {
    const rows = [
      { date: '2026-09-01', amount: 10, installment_months: 1 },
      { date: '2026-09-30', amount: 20, installment_months: 1 },
    ]

    expect(expandLedgerRowsInRange(rows, september)).toEqual(rows)
  })

  it('expands a mix of rows, keeping each installment tied to its purchase', () => {
    const coffee = { category_id: 'food', type: 'expense' as const, date: '2026-09-02', amount: 60, installment_months: 1 }

    expect(expandLedgerRowsInRange([travel, coffee], september)).toEqual([
      { ...travel, date: '2026-09-15', amount: 1666.66 },
      coffee,
    ])
  })
})

describe('isIncomeFundedExpense', () => {
  it('counts only expenses funded by income', () => {
    expect(isIncomeFundedExpense({ type: 'expense', funding_source: 'income' })).toBe(true)
    expect(isIncomeFundedExpense({ type: 'expense', funding_source: 'savings' })).toBe(false)
  })

  it('never counts income or reimbursements as spend', () => {
    expect(isIncomeFundedExpense({ type: 'income', funding_source: 'income' })).toBe(false)
    expect(isIncomeFundedExpense({ type: 'reimbursement', funding_source: 'income' })).toBe(false)
  })
})

describe('getPaymentPlanErrors', () => {
  const financedTravel: PaymentPlan = {
    type: 'expense',
    amount: 20000,
    installmentMonths: 12,
    fundingSource: 'income',
    paymentMethodCount: 1,
  }

  it('accepts a financed expense with one payment method', () => {
    expect(getPaymentPlanErrors(financedTravel)).toEqual([])
    expect(getPaymentPlanErrors({ ...financedTravel, fundingSource: 'savings' })).toEqual([])
  })

  it('accepts a single-payment expense, split across methods or covered by savings', () => {
    const groceries: PaymentPlan = { ...financedTravel, amount: 850.5, installmentMonths: 1, paymentMethodCount: 2 }

    expect(getPaymentPlanErrors(groceries)).toEqual([])
    expect(getPaymentPlanErrors({ ...groceries, fundingSource: 'savings' })).toEqual([])
  })

  it('does not check decimals on single-payment expenses, leaving existing behavior unchanged', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, amount: 10.005, installmentMonths: 1 })).toEqual([])
  })

  it('accepts income and reimbursements with the defaults', () => {
    const salary: PaymentPlan = { ...financedTravel, type: 'income', installmentMonths: 1 }

    expect(getPaymentPlanErrors(salary)).toEqual([])
    expect(getPaymentPlanErrors({ ...salary, type: 'reimbursement' })).toEqual([])
  })

  it('rejects financing or savings funding on income and reimbursements', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, type: 'income' })).toEqual(['notAnExpense'])
    expect(
      getPaymentPlanErrors({ ...financedTravel, type: 'reimbursement', installmentMonths: 1, fundingSource: 'savings' })
    ).toEqual(['notAnExpense'])
  })

  it('accepts the minimum and maximum number of months', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, installmentMonths: 2 })).toEqual([])
    expect(getPaymentPlanErrors({ ...financedTravel, installmentMonths: 48 })).toEqual([])
  })

  it('rejects months out of range or not whole', () => {
    for (const installmentMonths of [0, -3, 49, 2.5, Number.NaN]) {
      expect(getPaymentPlanErrors({ ...financedTravel, installmentMonths })).toEqual(['invalidMonths'])
    }
  })

  it('rejects a financed purchase split across payment methods', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, paymentMethodCount: 2 })).toEqual(['multiplePaymentMethods'])
  })

  it('rejects a financed amount with more than 2 decimals', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, amount: 20000.005 })).toEqual(['tooManyDecimals'])
  })

  it('leaves a missing or non-positive amount to the form\'s own check', () => {
    expect(getPaymentPlanErrors({ ...financedTravel, amount: Number.NaN })).toEqual([])
    expect(getPaymentPlanErrors({ ...financedTravel, amount: 0 })).toEqual([])
  })

  it('reports every broken rule at once', () => {
    expect(
      getPaymentPlanErrors({ ...financedTravel, installmentMonths: 60, paymentMethodCount: 3, amount: 1.234 })
    ).toEqual(['invalidMonths', 'multiplePaymentMethods', 'tooManyDecimals'])
  })
})
