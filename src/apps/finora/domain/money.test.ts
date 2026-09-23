import { describe, expect, it } from 'vitest'
import { roundMoneyInput } from './money'

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
