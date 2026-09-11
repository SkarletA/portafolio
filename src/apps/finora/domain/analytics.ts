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
export function getPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

export function getSavingsRate(totalIncome: number, totalSpent: number): number {
  if (totalIncome <= 0) return 0
  return ((totalIncome - totalSpent) / totalIncome) * 100
}

export function getAveragePerDay(totalSpent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return totalSpent / daysElapsed
}

export function getCategoryPercentage(amount: number, total: number): number {
  if (total <= 0) return 0
  return (amount / total) * 100
}
