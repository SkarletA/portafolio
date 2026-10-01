import { useCallback, useEffect, useRef, useState } from 'react'
import { getBudgets, type BudgetWithCategory } from '@services/budgetsService'
import { getCurrentMonthRange, getExpensesByCategory, getHouseholdContributionsByCategory } from '@services/transactionsService'
import { getCategories } from '@services/categoriesService'
import { useHousehold } from '@context/HouseholdContext'
import { getBudgetProgress, type BudgetStatus } from '@domain/budget'
import type { Category } from '@domain/category'
import { addMoney } from '@domain/money'

export interface BudgetBreakdownItem {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  translationKey: string | null
  amount: number
}

export interface HouseholdContributions {
  own: number
  partner: number
}

export type BudgetWithProgress = BudgetWithCategory & {
  spent: number
  effectiveLimit: number
  /** Spent in this budget's categories but covered by savings, so not in `spent`. */
  coveredBySavings: number
  percentage: number
  status: BudgetStatus
  breakdown: BudgetBreakdownItem[]
  /**
   * For a household budget, each member's tagged contribution to `spent`
   * (ADR-010's "two entries"); absent for a personal budget.
   */
  householdContributions?: HouseholdContributions
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
    translationKey: child.translationKey,
    amount: rawByCategory[child.id] ?? 0,
  }))

  const directToParent = rawByCategory[categoryId] ?? 0
  if (directToParent > 0) {
    items.push({
      category_id: `${categoryId}:other`,
      name: OTHER_BREAKDOWN_LABEL,
      icon: null,
      color: null,
      translationKey: null,
      amount: directToParent,
    })
  }

  return items.sort((a, b) => b.amount - a.amount)
}

export function useBudgets() {
  const { ownMember, partnerMember } = useHousehold()
  const [budgets, setBudgets] = useState<BudgetWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Both sides accepted (ADR-007) - a pending invitation either way behaves
  // as without a household. A plain string (not the ids themselves, recreated
  // every render) is what actually goes in refetch's dependencies below.
  const householdMemberKey =
    ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'
      ? `${ownMember.user_id},${partnerMember.user_id}`
      : ''

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const householdMemberIds = householdMemberKey ? householdMemberKey.split(',') : undefined
    const monthRange = getCurrentMonthRange()

    const [
      { data: budgetsData, error: budgetsError },
      { data: expensesData, error: expensesError },
      { data: categoriesData, error: categoriesError },
      { data: householdData, error: householdError },
    ] = await Promise.all([
      getBudgets(householdMemberIds),
      getExpensesByCategory(monthRange),
      getCategories(),
      householdMemberIds
        ? getHouseholdContributionsByCategory(monthRange, { ownId: householdMemberIds[0], partnerId: householdMemberIds[1] })
        : Promise.resolve({ data: null, error: null }),
    ])

    if (!mountedRef.current) return

    const fetchError = budgetsError || expensesError || categoriesError || householdError

    if (fetchError) {
      setError(fetchError.message)
      setBudgets([])
    } else {
      // Money arithmetic throws for an amount with more than 2 decimals (ADR-005);
      // that is shown as an error instead of leaving the page loading.
      try {
        const totalsByCategory = expensesData?.totals ?? {}
        const rawByCategory = expensesData?.raw ?? {}
        const reimbursementsByCategory = expensesData?.reimbursements ?? {}
        const savingsCoveredByCategory = expensesData?.savingsCovered ?? {}
        const categories = (categoriesData ?? []) as Category[]

        const budgetsWithProgress = ((budgetsData ?? []) as BudgetWithCategory[]).map((budget) => {
          // What counts toward a household budget is exactly what both members
          // explicitly tagged in that category - never a personal, untagged
          // expense in the same category, even the creator's own. See
          // docs/adr/010-household-expense-tag-and-household-budget.md.
          const householdContributions: HouseholdContributions | undefined =
            budget.is_household && householdData
              ? {
                  own: householdData.own[budget.category_id] ?? 0,
                  partner: householdData.partner[budget.category_id] ?? 0,
                }
              : undefined

          const spent = householdContributions
            ? addMoney(householdContributions.own, householdContributions.partner)
            : (totalsByCategory[budget.category_id] ?? 0)

          // A reimbursement widens how much a budget can absorb this period
          // rather than shrinking the displayed spend. See
          // docs/adr/002-gross-spend-and-effective-limit.md.
          const effectiveLimit = addMoney(budget.monthly_limit, reimbursementsByCategory[budget.category_id] ?? 0)
          const { percentage, status } = getBudgetProgress(effectiveLimit, spent)
          const breakdown = buildBreakdown(budget.category_id, categories, rawByCategory)
          // Excluded from `spent` but reported, so it doesn't silently vanish.
          // See docs/adr/003-installments-and-savings-funding.md.
          const coveredBySavings = savingsCoveredByCategory[budget.category_id] ?? 0

          return {
            ...budget,
            spent,
            effectiveLimit,
            coveredBySavings,
            percentage,
            status,
            breakdown,
            ...(householdContributions ? { householdContributions } : {}),
          }
        })

        setBudgets(budgetsWithProgress)
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught))
        setBudgets([])
      }
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

  return { budgets, loading, error, refetch }
}
