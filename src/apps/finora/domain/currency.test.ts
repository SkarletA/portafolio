import { describe, expect, it } from 'vitest'
import { formatCurrency, getLocaleForLanguage } from './currency'

describe('formatCurrency', () => {
  it('formats MXN with the es-MX locale', () => {
    expect(formatCurrency(1234.5, 'MXN', 'es-MX')).toBe('$1,234.50')
  })

  it('formats USD with the en-US locale', () => {
    expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('formats EUR with the es-MX locale using the ISO code, no known symbol mapping', () => {
    expect(formatCurrency(1234.5, 'EUR', 'es-MX')).toBe('EUR 1,234.50')
  })

  it('formats EUR with the en-US locale using the euro symbol', () => {
    expect(formatCurrency(1234.5, 'EUR', 'en-US')).toBe('€1,234.50')
  })

  it('supports an options override, e.g. to drop decimals for compact display', () => {
    expect(formatCurrency(1234, 'USD', 'en-US', { maximumFractionDigits: 0 })).toBe('$1,234')
  })

  it('does not convert or round the underlying amount, only relabels it', () => {
    expect(formatCurrency(0.1, 'MXN', 'es-MX')).toBe('$0.10')
  })
})

describe('getLocaleForLanguage', () => {
  it('maps Spanish to es-MX', () => {
    expect(getLocaleForLanguage('es')).toBe('es-MX')
  })

  it('maps English to en-US', () => {
    expect(getLocaleForLanguage('en')).toBe('en-US')
  })
})
