import { useCallback, useEffect, useRef, useState } from 'react'
import { getBudgets, type BudgetWithCategory } from '../services/budgetsService'
import { getCurrentMonthRange, getExpensesByCategory } from '../services/transactionsService'
import { getCategories } from '../services/categoriesService'
import { getBudgetProgress, type BudgetStatus } from '../domain/budget'
import type { Category } from '../domain/category'

export interface BudgetBreakdownItem {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  amount: number
}

export type BudgetWithProgress = BudgetWithCategory & {
  spent: number
  effectiveLimit: number
  percentage: number
  status: BudgetStatus
  breakdown: BudgetBreakdownItem[]
}

const OTHER_BREAKDOWN_LABEL = 'Other'

// A budget's own category can have direct transactions too (the subcategory
// picker is optional), so the breakdown needs an "Other" row for that direct
// spend - otherwise the subcategories alone wouldn't reconcile with the
// budget's rolled-up total.
function buildBreakdown(
  categoryId: string,
  categories: Category[],
  rawByCategory: Record<string, number>
): BudgetBreakdownItem[] {
  const children = categories.filter((category) => category.parent_id === categoryId)
  if (children.length === 0) return []

  const items: BudgetBreakdownItem[] = children.map((child) => ({
    category_id: child.id,
    name: child.name,
    icon: child.icon,
    color: child.color,
    amount: rawByCategory[child.id] ?? 0,
  }))

  const directToParent = rawByCategory[categoryId] ?? 0
  if (directToParent > 0) {
    items.push({
      category_id: `${categoryId}:other`,
      name: OTHER_BREAKDOWN_LABEL,
      icon: null,
      color: null,
      amount: directToParent,
    })
  }

  return items.sort((a, b) => b.amount - a.amount)
}

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [
      { data: budgetsData, error: budgetsError },
      { data: expensesData, error: expensesError },
      { data: categoriesData, error: categoriesError },
    ] = await Promise.all([getBudgets(), getExpensesByCategory(getCurrentMonthRange()), getCategories()])

    if (!mountedRef.current) return

    const fetchError = budgetsError || expensesError || categoriesError

    if (fetchError) {
      setError(fetchError.message)
      setBudgets([])
    } else {
      const totalsByCategory = expensesData?.totals ?? {}
      const rawByCategory = expensesData?.raw ?? {}
      const reimbursementsByCategory = expensesData?.reimbursements ?? {}
      const categories = (categoriesData ?? []) as Category[]

      const budgetsWithProgress = ((budgetsData ?? []) as BudgetWithCategory[]).map((budget) => {
        const spent = totalsByCategory[budget.category_id] ?? 0
        // A reimbursement widens how much a budget can absorb this period
        // rather than shrinking the displayed spend. See
        // docs/adr/002-gross-spend-and-effective-limit.md.
        const effectiveLimit = budget.monthly_limit + (reimbursementsByCategory[budget.category_id] ?? 0)
        const { percentage, status } = getBudgetProgress(effectiveLimit, spent)
        const breakdown = buildBreakdown(budget.category_id, categories, rawByCategory)

        return { ...budget, spent, effectiveLimit, percentage, status, breakdown }
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
