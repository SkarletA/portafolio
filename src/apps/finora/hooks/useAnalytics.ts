import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildCategoryComparison,
  buildCategorySpending,
  getHouseholdSpendingByCategory,
  getHouseholdTrendData,
  getMonthlyStats,
  getPeriodComparison,
  getTrendData,
  type CategorySpending,
  type MonthlyStats,
  type PeriodComparison,
  type PeriodComparisonCategory,
  type TrendPoint,
} from '@services/analyticsService'
import { getExpensesByCategory } from '@services/transactionsService'
import { getCategories } from '@services/categoriesService'
import { getPeriodRange, type PeriodType } from '@domain/analytics'
import type { Category } from '@domain/category'
import { useHousehold } from '@context/HouseholdContext'

export type AnalyticsViewMode = 'mine' | 'household'

/** Spending by category, Top categories: one list per member, never blind-merged - only what each tagged (ADR-010/011). */
export interface HouseholdCategoryColumns {
  own: CategorySpending[]
  partner: CategorySpending[]
}

/** One trend bucket: `own`/`partner` are the stacked bar's two segments. */
export interface HouseholdTrendPoint {
  date: string
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

// viewMode: 'household' combines both household members' numbers, only once
// the household is accepted; 'mine' (the default) behaves exactly as before.
// In 'household', the top summary (stats) and the comparison's headline total
// stay one fused figure (full visibility, ADR-011), but the category
// breakdown, trend chart and comparison table are each member's *tagged*
// spend only (ADR-010's attribution) split into two columns - the same rule
// the household budget already uses, not a separate blind merge. See
// docs/adr/011-household-combined-analytics.md. The toggle itself lives in
// Analytics.tsx, same Mine/Household pattern Transactions already uses.
export function useAnalytics(periodType: PeriodType = 'month', viewMode: AnalyticsViewMode = 'mine') {
  const { ownMember, partnerMember } = useHousehold()
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [rawByCategory, setRawByCategory] = useState<Record<string, number>>({})
  const [householdBreakdown, setHouseholdBreakdown] = useState<HouseholdCategoryColumns | null>(null)
  const [householdRaw, setHouseholdRaw] = useState<{ own: Record<string, number>; partner: Record<string, number> } | null>(
    null
  )
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
        { data: expensesData, error: expensesError },
        { data: categoriesData, error: categoriesError },
        { data: trendPoints, error: trendError },
        { data: comparisonData, error: comparisonError },
      ] = await Promise.all([
        getMonthlyStats(current, undefined),
        getExpensesByCategory(current, undefined),
        getCategories(),
        getTrendData(periodType, undefined),
        getPeriodComparison(periodType, undefined),
      ])

      if (!mountedRef.current) return

      const fetchError = statsError || expensesError || categoriesError || trendError || comparisonError

      if (fetchError) {
        setError(fetchError.message)
        setStats(null)
        setSpendingByCategory([])
        setCategories([])
        setRawByCategory({})
        setTrendData([])
        setComparison(null)
      } else {
        const loadedCategories = (categoriesData ?? []) as Category[]
        setStats(statsData)
        setSpendingByCategory(buildCategorySpending(expensesData?.totals ?? {}, loadedCategories))
        setCategories(loadedCategories)
        setRawByCategory(expensesData?.raw ?? {})
        setTrendData(trendPoints ?? [])
        setComparison(comparisonData)
      }
      setHouseholdBreakdown(null)
      setHouseholdRaw(null)
      setHouseholdTrend([])
      setHouseholdComparison(null)

      setLoading(false)
      return
    }

    const [ownId, partnerId] = householdMemberKey.split(',')
    const householdMemberIds = [ownId, partnerId]
    const members = { ownId, partnerId }

    const [
      { data: statsData, error: statsError },
      { data: currentSpending, error: currentSpendingError },
      { data: previousSpending, error: previousSpendingError },
      { data: trendPoints, error: trendError },
      { data: headlineComparison, error: headlineError },
      { data: categoriesData, error: categoriesError },
    ] = await Promise.all([
      getMonthlyStats(current, householdMemberIds),
      getHouseholdSpendingByCategory(current, members),
      getHouseholdSpendingByCategory(previous, members),
      getHouseholdTrendData(periodType, members),
      getPeriodComparison(periodType, householdMemberIds),
      getCategories(),
    ])

    if (!mountedRef.current) return

    const fetchError =
      statsError || currentSpendingError || previousSpendingError || trendError || headlineError || categoriesError

    if (fetchError) {
      setError(fetchError.message)
      setStats(null)
      setCategories([])
      setHouseholdBreakdown(null)
      setHouseholdRaw(null)
      setHouseholdTrend([])
      setHouseholdComparison(null)
    } else {
      setStats(statsData)
      setCategories((categoriesData ?? []) as Category[])
      setHouseholdBreakdown({ own: currentSpending?.own ?? [], partner: currentSpending?.partner ?? [] })
      setHouseholdRaw({ own: currentSpending?.ownRaw ?? {}, partner: currentSpending?.partnerRaw ?? {} })
      setHouseholdTrend(trendPoints ?? [])
      setHouseholdComparison(
        headlineComparison
          ? {
              currentTotal: headlineComparison.currentTotal,
              previousTotal: headlineComparison.previousTotal,
              totalPercentChange: headlineComparison.totalPercentChange,
              hasPreviousData: headlineComparison.hasPreviousData,
              own: buildCategoryComparison(currentSpending?.own ?? [], previousSpending?.own ?? []),
              partner: buildCategoryComparison(currentSpending?.partner ?? [], previousSpending?.partner ?? []),
            }
          : null
      )
    }
    setSpendingByCategory([])
    setRawByCategory({})
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
    categories,
    rawByCategory,
    householdBreakdown,
    householdRaw,
    householdTrend,
    householdComparison,
    isHouseholdView,
    loading,
    error,
    refetch,
  }
}
