import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildCategoryComparison,
  getMonthlyStats,
  getPeriodComparison,
  getSpendingByCategory,
  getTrendData,
  type CategorySpending,
  type MonthlyStats,
  type PeriodComparison,
  type PeriodComparisonCategory,
  type TrendPoint,
} from '@services/analyticsService'
import { getPeriodRange, type PeriodType } from '@domain/analytics'
import { useHousehold } from '@context/HouseholdContext'
import { addMoney } from '@domain/money'

export type AnalyticsViewMode = 'mine' | 'household'

/** Spending by category, Top categories: one list per member, never blind-merged (ADR-011). */
export interface HouseholdCategoryColumns {
  own: CategorySpending[]
  partner: CategorySpending[]
}

/** One trend bucket: `amount` (own + partner) is the stacked bar's height, `own`/`partner` its two segments. */
export interface HouseholdTrendPoint {
  date: string
  amount: number
  own: number
  partner: number
}

/** The headline total stays one combined figure; the category table splits per member (ADR-011). */
export interface HouseholdComparison {
  currentTotal: number
  previousTotal: number
  totalPercentChange: number | null
  hasPreviousData: boolean
  own: PeriodComparisonCategory[]
  partner: PeriodComparisonCategory[]
}

function mergeHouseholdTrend(own: TrendPoint[], partner: TrendPoint[]): HouseholdTrendPoint[] {
  return own.map((point, index) => {
    const partnerAmount = partner[index]?.amount ?? 0
    return { date: point.date, own: point.amount, partner: partnerAmount, amount: addMoney(point.amount, partnerAmount) }
  })
}

// viewMode: 'household' combines both household members' numbers, only once
// the household is accepted; 'mine' (the default) behaves exactly as before.
// In 'household', the top summary (stats) and the comparison's headline total
// stay one fused figure, but the category breakdown, trend chart and
// comparison table split per member instead of merging into one blind total
// - a household overview that hides who spent what defeats its own purpose.
// See docs/adr/011-household-combined-analytics.md. The toggle itself lives
// in Analytics.tsx, same Mine/Household pattern Transactions already uses.
export function useAnalytics(periodType: PeriodType = 'month', viewMode: AnalyticsViewMode = 'mine') {
  const { ownMember, partnerMember } = useHousehold()
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [householdBreakdown, setHouseholdBreakdown] = useState<HouseholdCategoryColumns | null>(null)
  const [householdTrend, setHouseholdTrend] = useState<HouseholdTrendPoint[]>([])
  const [householdComparison, setHouseholdComparison] = useState<HouseholdComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const isHouseholdActive = ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'
  const isHouseholdView = viewMode === 'household' && isHouseholdActive
  const householdMemberKey = isHouseholdView ? `${ownMember.user_id},${partnerMember.user_id}` : ''

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { current, previous } = getPeriodRange(periodType, new Date())

    if (!householdMemberKey) {
      const [
        { data: statsData, error: statsError },
        { data: categoryData, error: categoryError },
        { data: trendPoints, error: trendError },
        { data: comparisonData, error: comparisonError },
      ] = await Promise.all([
        getMonthlyStats(current, undefined),
        getSpendingByCategory(current, undefined),
        getTrendData(periodType, undefined),
        getPeriodComparison(periodType, undefined),
      ])

      if (!mountedRef.current) return

      const fetchError = statsError || categoryError || trendError || comparisonError

      if (fetchError) {
        setError(fetchError.message)
        setStats(null)
        setSpendingByCategory([])
        setTrendData([])
        setComparison(null)
      } else {
        setStats(statsData)
        setSpendingByCategory(categoryData ?? [])
        setTrendData(trendPoints ?? [])
        setComparison(comparisonData)
      }
      setHouseholdBreakdown(null)
      setHouseholdTrend([])
      setHouseholdComparison(null)

      setLoading(false)
      return
    }

    const [ownId, partnerId] = householdMemberKey.split(',')
    const householdMemberIds = [ownId, partnerId]

    const [
      { data: statsData, error: statsError },
      { data: ownCurrentCategories, error: ownCurrentError },
      { data: partnerCurrentCategories, error: partnerCurrentError },
      { data: ownPreviousCategories, error: ownPreviousError },
      { data: partnerPreviousCategories, error: partnerPreviousError },
      { data: ownTrendPoints, error: ownTrendError },
      { data: partnerTrendPoints, error: partnerTrendError },
      { data: headlineComparison, error: headlineError },
    ] = await Promise.all([
      getMonthlyStats(current, householdMemberIds),
      getSpendingByCategory(current, [ownId]),
      getSpendingByCategory(current, [partnerId]),
      getSpendingByCategory(previous, [ownId]),
      getSpendingByCategory(previous, [partnerId]),
      getTrendData(periodType, [ownId]),
      getTrendData(periodType, [partnerId]),
      getPeriodComparison(periodType, householdMemberIds),
    ])

    if (!mountedRef.current) return

    const fetchError =
      statsError ||
      ownCurrentError ||
      partnerCurrentError ||
      ownPreviousError ||
      partnerPreviousError ||
      ownTrendError ||
      partnerTrendError ||
      headlineError

    if (fetchError) {
      setError(fetchError.message)
      setStats(null)
      setHouseholdBreakdown(null)
      setHouseholdTrend([])
      setHouseholdComparison(null)
    } else {
      setStats(statsData)
      setHouseholdBreakdown({ own: ownCurrentCategories ?? [], partner: partnerCurrentCategories ?? [] })
      setHouseholdTrend(mergeHouseholdTrend(ownTrendPoints ?? [], partnerTrendPoints ?? []))
      setHouseholdComparison(
        headlineComparison
          ? {
              currentTotal: headlineComparison.currentTotal,
              previousTotal: headlineComparison.previousTotal,
              totalPercentChange: headlineComparison.totalPercentChange,
              hasPreviousData: headlineComparison.hasPreviousData,
              own: buildCategoryComparison(ownCurrentCategories ?? [], ownPreviousCategories ?? []),
              partner: buildCategoryComparison(partnerCurrentCategories ?? [], partnerPreviousCategories ?? []),
            }
          : null
      )
    }
    setSpendingByCategory([])
    setTrendData([])
    setComparison(null)

    setLoading(false)
  }, [periodType, householdMemberKey])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return {
    stats,
    spendingByCategory,
    trendData,
    comparison,
    householdBreakdown,
    householdTrend,
    householdComparison,
    isHouseholdView,
    loading,
    error,
    refetch,
  }
}
