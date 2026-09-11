import { useCallback, useEffect, useRef, useState } from 'react'
import { getBudgets, type BudgetWithCategory } from '../services/budgetsService'
import { getExpensesByCategoryForCurrentMonth } from '../services/transactionsService'
import { getBudgetProgress, type BudgetStatus } from '../domain/budget'

export type BudgetWithProgress = BudgetWithCategory & {
  spent: number
  percentage: number
  status: BudgetStatus
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: budgetsData, error: budgetsError }, { data: expensesData, error: expensesError }] =
      await Promise.all([getBudgets(), getExpensesByCategoryForCurrentMonth()])

    if (!mountedRef.current) return

    const fetchError = budgetsError || expensesError

    if (fetchError) {
      setError(fetchError.message)
      setBudgets([])
    } else {
      const expensesByCategory = expensesData ?? {}

      const budgetsWithProgress = ((budgetsData ?? []) as BudgetWithCategory[]).map((budget) => {
        const spent = expensesByCategory[budget.category_id] ?? 0
        const { percentage, status } = getBudgetProgress(budget.monthly_limit, spent)

        return { ...budget, spent, percentage, status }
      })

      setBudgets(budgetsWithProgress)
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

  return { budgets, loading, error, refetch }
}
