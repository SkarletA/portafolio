import { supabase } from './supabaseClient'
import { getCurrentMonthRange, getExpensesByCategoryForCurrentMonth } from './transactionsService'
import { getCategories } from './categoriesService'
import { getAveragePerDay, getCategoryPercentage, getSavingsRate } from '../domain/analytics'
import type { Category } from '../domain/category'

export interface MonthlyStats {
  totalSpent: number
  totalIncome: number
  avgPerDay: number
  savingsRate: number
}

export async function getMonthlyStats() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { start, end, dayOfMonth } = getCurrentMonthRange()

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userData.user.id)
    .gte('date', start)
    .lte('date', end)

  if (error) return { data: null, error }

  const totals = (data ?? []).reduce(
    (acc, row) => {
      if (row.type === 'expense') {
        acc.totalSpent += row.amount
      } else if (row.type === 'reimbursement') {
        acc.totalSpent -= row.amount
      } else {
        acc.totalIncome += row.amount
      }
      return acc
    },
    { totalSpent: 0, totalIncome: 0 }
  )

  totals.totalSpent = Math.max(totals.totalSpent, 0)

  const stats: MonthlyStats = {
    totalSpent: totals.totalSpent,
    totalIncome: totals.totalIncome,
    avgPerDay: getAveragePerDay(totals.totalSpent, dayOfMonth),
    savingsRate: getSavingsRate(totals.totalIncome, totals.totalSpent),
  }

  return { data: stats, error: null }
}

export interface CategorySpending {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  amount: number
  percentage: number
}

export async function getSpendingByCategory() {
  const [{ data: expensesByCategory, error: expensesError }, { data: categoriesData, error: categoriesError }] =
    await Promise.all([getExpensesByCategoryForCurrentMonth(), getCategories()])

  const error = expensesError || categoriesError
  if (error) return { data: null, error }

  const categories = (categoriesData ?? []) as Category[]
  // Only top-level categories are listed: each one's amount already includes
  // its subcategories via getNetSpendByCategory's rollup, so listing children
  // as separate rows too would double-count spend and push percentages past 100%.
  const topLevelCategories = categories.filter((category) => !category.parent_id)
  const expensesMap = expensesByCategory ?? {}
  const totalSpent = topLevelCategories.reduce((sum, category) => sum + (expensesMap[category.id] ?? 0), 0)

  const spending: CategorySpending[] = topLevelCategories
    .map((category) => {
      const amount = expensesMap[category.id] ?? 0
      return {
        category_id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        amount,
        percentage: getCategoryPercentage(amount, totalSpent),
      }
    })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  return { data: spending, error: null }
}

export interface DailySpending {
  date: string
  amount: number
}

export async function getDailySpending() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { start, end } = getCurrentMonthRange()

  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount')
    .eq('user_id', userData.user.id)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)

  if (error) return { data: null, error }

  const totalsByDate = (data ?? []).reduce<Record<string, number>>((totals, row) => {
    totals[row.date] = (totals[row.date] ?? 0) + row.amount
    return totals
  }, {})

  const dailySpending: DailySpending[] = Object.entries(totalsByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { data: dailySpending, error: null }
}
