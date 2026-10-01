import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getMonthlyStats,
  getSpendingByCategory,
  type CategorySpending,
  type MonthlyStats,
} from '@services/analyticsService'
import { getPeriodRange } from '@domain/analytics'
import { useHousehold } from '@context/HouseholdContext'

// Current-month stats and category spend for the Dashboard overview - the
// same functions and range Analytics uses (so the numbers always agree), but
// without Analytics' trend/comparison queries, which Dashboard doesn't show.
//
// Combines both household members' numbers automatically once the household
// is accepted, with no toggle - matching how Dashboard's Recent transactions
// and Budgets sections already behave (ADR-011). Analytics keeps a Mine/
// Household toggle for the deep-dive view; this overview does not need one.
export function useDashboardSummary() {
  const { ownMember, partnerMember } = useHousehold()
  const [stats, setStats] = useState<MonthlyStats | null>(null)
  const [spendingByCategory, setSpendingByCategory] = useState<CategorySpending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const householdMemberKey =
    ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'
      ? `${ownMember.user_id},${partnerMember.user_id}`
      : ''

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { current } = getPeriodRange('month', new Date())
    const householdMemberIds = householdMemberKey ? householdMemberKey.split(',') : undefined

    const [{ data: statsData, error: statsError }, { data: categoryData, error: categoryError }] = await Promise.all(
      [getMonthlyStats(current, householdMemberIds), getSpendingByCategory(current, householdMemberIds)]
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
  }, [householdMemberKey])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { stats, spendingByCategory, loading, error, refetch }
}
