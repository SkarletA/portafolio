import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getDailySpending,
  getMonthlyStats,
  getSpendingByCategory,
  type CategorySpending,
  type DailySpending,
  type MonthlyStats,
} from '../services/analyticsService'

export function useAnalytics() {
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [dailySpending, setDailySpending] = useState<DailySpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [
      { data: statsData, error: statsError },
      { data: categoryData, error: categoryError },
      { data: dailyData, error: dailyError },
    ] = await Promise.all([getMonthlyStats(), getSpendingByCategory(), getDailySpending()])

    if (!mountedRef.current) return

    const fetchError = statsError || categoryError || dailyError

    if (fetchError) {
      setError(fetchError.message)
      setStats(null)
      setSpendingByCategory([])
      setDailySpending([])
    } else {
      setStats(statsData)
      setSpendingByCategory(categoryData ?? [])
      setDailySpending(dailyData ?? [])
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

  return { stats, spendingByCategory, dailySpending, loading, error, refetch }
}
