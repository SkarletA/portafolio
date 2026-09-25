import { describe, expect, it } from 'vitest'
import { roundMoneyInput, toMinorUnits } from './money'

describe('roundMoneyInput', () => {
  it('rounds more than 2 decimals half up', () => {
    expect(roundMoneyInput('10.005')).toBe('10.01')
    expect(roundMoneyInput('10.004')).toBe('10.00')
    expect(roundMoneyInput('20000.12999')).toBe('20000.13')
  })

  it('is exact where floating-point rounding is not', () => {
    // Math.round(1.005 * 100) / 100 === 1
    expect(roundMoneyInput('1.005')).toBe('1.01')
    expect(roundMoneyInput('2.675')).toBe('2.68')
  })

  it('carries into the units', () => {
    expect(roundMoneyInput('9.999')).toBe('10.00')
    expect(roundMoneyInput('.995')).toBe('1.00')
  })

  it('rounds negative amounts away from zero', () => {
    expect(roundMoneyInput('-1.005')).toBe('-1.01')
    expect(roundMoneyInput('-0.001')).toBe('0.00')
  })

  it('leaves text with 2 decimals or fewer untouched', () => {
    for (const text of ['', '12', '12.3', '12.30', '0.05', '.5']) {
      expect(roundMoneyInput(text)).toBe(text)
    }
  })

  it('leaves text that is not a plain decimal number for validation to handle', () => {
    for (const text of ['abc', '1e5', '1.2.3', '1,005']) {
      expect(roundMoneyInput(text)).toBe(text)
    }
  })
})

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
