import type { Currency, Language } from './profile'

// Display-only locale per UI language - this is not the user's real region,
// just a consistent base (thousands/decimal separators, symbol placement)
// for Intl.NumberFormat to render amounts in each supported language.
export function getLocaleForLanguage(language: Language): string {
  return language === 'es' ? 'es-MX' : 'en-US'
}

// Amounts are always shown with exactly 2 decimals: every supported currency
// (MXN, USD, EUR) has 2 and amounts are stored as numeric(12,2), so showing
// fewer would hide cents the user recorded. This is set explicitly, not left to
// Intl's per-currency default, and there is deliberately no per-call override.
const MONEY_FRACTION_DIGITS = 2

// Formatting only - amounts are not converted between currencies. The number
// stored is displayed as-is, just relabeled with the selected currency's
// symbol and separators.
export function formatCurrency(amount: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: MONEY_FRACTION_DIGITS,
    maximumFractionDigits: MONEY_FRACTION_DIGITS,
  }).format(amount)
}
