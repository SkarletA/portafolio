import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMonthlyStats,
  getSpendingByCategory,
  type CategorySpending,
  type MonthlyStats,
} from '../services/analyticsService'
import { getPeriodRange } from '../domain/analytics'

// Current-month stats and category spend for the Dashboard overview - the
// same functions and range Analytics uses (so the numbers always agree), but
// without Analytics' trend/comparison queries, which Dashboard doesn't show.
export function useDashboardSummary() {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { current } = getPeriodRange('month', new Date())

    const [{ data: statsData, error: statsError }, { data: categoryData, error: categoryError }] = await Promise.all(
      [getMonthlyStats(current), getSpendingByCategory(current)]
    )

    if (!mountedRef.current) return

    const fetchError = statsError || categoryError

    if (fetchError) {
      setError(fetchError.message)
      setStats(null)
      setSpendingByCategory([])
    } else {
      setStats(statsData)
      setSpendingByCategory(categoryData ?? [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { stats, spendingByCategory, loading, error, refetch }
}
