import { subtractMoney, sumToMinorUnits } from './money'

export type PeriodType = 'day' | 'month' | 'year'

export interface DateRange {
  start: string
  end: string
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Ranges are computed in UTC, consistently with transactionsService's
// getCurrentMonthRange, so date-only comparisons against the `date` column
// don't drift across timezones.
export function getPeriodRange(
  periodType: PeriodType,
  referenceDate: Date
): { current: DateRange; previous: DateRange } {
  const year = referenceDate.getUTCFullYear()

  if (periodType === 'day') {
    const day = new Date(Date.UTC(year, referenceDate.getUTCMonth(), referenceDate.getUTCDate()))
    const previousDay = new Date(Date.UTC(year, referenceDate.getUTCMonth(), referenceDate.getUTCDate() - 1))

    return {
      current: { start: toIsoDate(day), end: toIsoDate(day) },
      previous: { start: toIsoDate(previousDay), end: toIsoDate(previousDay) },
    }
  }

  if (periodType === 'year') {
    return {
      current: { start: toIsoDate(new Date(Date.UTC(year, 0, 1))), end: toIsoDate(new Date(Date.UTC(year, 11, 31))) },
      previous: {
        start: toIsoDate(new Date(Date.UTC(year - 1, 0, 1))),
        end: toIsoDate(new Date(Date.UTC(year - 1, 11, 31))),
      },
    }
  }

  const month = referenceDate.getUTCMonth()

  return {
    current: {
      start: toIsoDate(new Date(Date.UTC(year, month, 1))),
      end: toIsoDate(new Date(Date.UTC(year, month + 1, 0))),
    },
    previous: {
      start: toIsoDate(new Date(Date.UTC(year, month - 1, 1))),
      end: toIsoDate(new Date(Date.UTC(year, month, 0))),
    },
  }
}

// null signals "no baseline to compare against" (previous period had zero
// activity), which callers use to render an empty comparison state instead
// of a fabricated percentage. Never returns NaN or Infinity.
//
// Both values are sums computed in JavaScript, so they are compared in cents:
// two periods with the same total must give exactly 0, not the 1e-14 that float
// noise leaves (0.1 + 0.2 against 0.3). Callers test the result with === 0, > 0
// and < 0. See docs/adr/005-money-arithmetic-in-the-client.md.
export function getPercentChange(current: number, previous: number): number | null {
  const currentCents = sumToMinorUnits(current)
  const previousCents = sumToMinorUnits(previous)

  if (previousCents === 0) return currentCents === 0 ? 0 : null
  if (currentCents === previousCents) return 0
  return ((currentCents - previousCents) / previousCents) * 100
}

export function getSavingsRate(totalIncome: number, totalSpent: number): number {
  if (totalIncome <= 0) return 0
  return (subtractMoney(totalIncome, totalSpent) / totalIncome) * 100
}

export function getAveragePerDay(totalSpent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return totalSpent / daysElapsed
}

export function getCategoryPercentage(amount: number, total: number): number {
  if (total <= 0) return 0
  return (amount / total) * 100
}
