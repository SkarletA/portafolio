import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMonthlyStats,
  getPeriodComparison,
  getSpendingByCategory,
  getTrendData,
  type CategorySpending,
  type MonthlyStats,
  type PeriodComparison,
  type TrendPoint,
} from '@services/analyticsService'
import { getPeriodRange, type PeriodType } from '@domain/analytics'
import { useHousehold } from '@context/HouseholdContext'

export type AnalyticsViewMode = 'mine' | 'household'

// viewMode: 'household' combines both household members' numbers (ADR-011's
// "full visibility, no tagging"), only once the household is accepted;
// 'mine' (the default) behaves exactly as before. The toggle itself lives in
// Analytics.tsx, same Mine/Household pattern Transactions already uses.
export function useAnalytics(periodType: PeriodType = 'month', viewMode: AnalyticsViewMode = 'mine') {
  const { ownMember, partnerMember } = useHousehold()
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const isHouseholdActive = ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'
  const householdMemberKey =
    viewMode === 'household' && isHouseholdActive ? `${ownMember.user_id},${partnerMember.user_id}` : ''

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { current } = getPeriodRange(periodType, new Date())
    const householdMemberIds = householdMemberKey ? householdMemberKey.split(',') : undefined

    const [
      { data: statsData, error: statsError },
      { data: categoryData, error: categoryError },
      { data: trendPoints, error: trendError },
      { data: comparisonData, error: comparisonError },
    ] = await Promise.all([
      getMonthlyStats(current, householdMemberIds),
      getSpendingByCategory(current, householdMemberIds),
      getTrendData(periodType, householdMemberIds),
      getPeriodComparison(periodType, householdMemberIds),
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

    setLoading(false)
  }, [periodType, householdMemberKey])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { stats, spendingByCategory, trendData, comparison, loading, error, refetch }
}
