import { describe, expect, it } from 'vitest'
import { allocateInstallments, getInstallmentDate, toMinorUnits } from './installments'

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
