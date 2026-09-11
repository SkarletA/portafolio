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
} from '../services/analyticsService'
import { getPeriodRange, type PeriodType } from '../domain/analytics'

export function useAnalytics(periodType: PeriodType = 'month') {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [comparison, setComparison] = useState<PeriodComparison | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { current } = getPeriodRange(periodType, new Date())

    const [
      { data: statsData, error: statsError },
      { data: categoryData, error: categoryError },
      { data: trendPoints, error: trendError },
      { data: comparisonData, error: comparisonError },
    ] = await Promise.all([
      getMonthlyStats(current),
      getSpendingByCategory(current),
      getTrendData(periodType),
      getPeriodComparison(periodType),
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
  }, [periodType])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { stats, spendingByCategory, trendData, comparison, loading, error, refetch }
}
