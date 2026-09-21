import type { Currency, Language } from './profile'

// Display-only locale per UI language - this is not the user's real region,
// just a consistent base (thousands/decimal separators, symbol placement)
// for Intl.NumberFormat to render amounts in each supported language.
export function getLocaleForLanguage(language: Language): string {
  return language === 'es' ? 'es-MX' : 'en-US'
}

// Formatting only - amounts are not converted between currencies. The number
// stored is displayed as-is, just relabeled with the selected currency's
// symbol and separators. `options` is an escape hatch for call sites that
// need a non-default precision (e.g. whole-amount stat cards), so those
// don't have to redefine their own Intl.NumberFormat.
export function formatCurrency(
  amount: number,
  currency: Currency,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(amount)
}
