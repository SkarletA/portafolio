import { getLocalCalendarDate } from './date'
import { subtractMoney, sumToMinorUnits } from './money'

export type PeriodType = 'day' | 'month' | 'year'

export interface DateRange {
  start: string
  end: string
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// referenceDate is an instant; its local calendar day decides the period
// (ADR-013). The ranges are then calendar-day arithmetic in UTC, which never
// reads the UTC clock, so the period changes at local midnight.
export function getPeriodRange(
  periodType: PeriodType,
  referenceDate: Date
): { current: DateRange; previous: DateRange } {
  const today = getLocalCalendarDate(referenceDate)
  const year = today.getUTCFullYear()

  if (periodType === 'day') {
    const day = new Date(Date.UTC(year, today.getUTCMonth(), today.getUTCDate()))
    const previousDay = new Date(Date.UTC(year, today.getUTCMonth(), today.getUTCDate() - 1))

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

  const month = today.getUTCMonth()

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

// The full date range covered by one trend bucket (getTrendWindow's
// day/month/year bucket dates) - used to drill into a clicked bucket's own
// Spending by category, separate from the chart's own "current period"
// range. `date` is the bucket's own date as the trend window produces it
// (an exact day, the first of a month, or January 1 of a year).
export function getBucketRange(date: string, periodType: PeriodType): DateRange {
  if (periodType === 'day') {
    return { start: date, end: date }
  }

  const year = Number(date.slice(0, 4))

  if (periodType === 'year') {
    return { start: toIsoDate(new Date(Date.UTC(year, 0, 1))), end: toIsoDate(new Date(Date.UTC(year, 11, 31))) }
  }

  const month = Number(date.slice(5, 7)) - 1
  return {
    start: toIsoDate(new Date(Date.UTC(year, month, 1))),
    end: toIsoDate(new Date(Date.UTC(year, month + 1, 0))),
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
