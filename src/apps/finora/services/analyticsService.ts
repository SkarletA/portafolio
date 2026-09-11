import { supabase } from './supabaseClient'
import { getExpensesByCategory } from './transactionsService'
import { getCategories } from './categoriesService'
import {
  getAveragePerDay,
  getCategoryPercentage,
  getPercentChange,
  getPeriodRange,
  getSavingsRate,
  type DateRange,
  type PeriodType,
} from '../domain/analytics'
import type { Category } from '../domain/category'

export interface MonthlyStats {
  totalSpent: number
  totalIncome: number
  avgPerDay: number
  savingsRate: number
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Elapsed days within the range, clamped to "today" when the range extends
// into the future (e.g. the current month) - same value getCurrentMonthRange
// used to hand back as dayOfMonth, generalized to any range.
function daysElapsedInRange({ start, end }: DateRange): number {
  const startDate = new Date(`${start}T00:00:00Z`)
  const endDate = new Date(`${end}T00:00:00Z`)
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const effectiveEnd = todayUtc < endDate ? todayUtc : endDate

  return Math.max(Math.round((effectiveEnd.getTime() - startDate.getTime()) / 86400000) + 1, 0)
}

export async function getMonthlyStats(range: DateRange) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('user_id', userData.user.id)
    .gte('date', range.start)
    .lte('date', range.end)

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
    avgPerDay: getAveragePerDay(totals.totalSpent, daysElapsedInRange(range)),
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

export async function getSpendingByCategory(range: DateRange) {
  const [{ data: expensesByCategory, error: expensesError }, { data: categoriesData, error: categoriesError }] =
    await Promise.all([getExpensesByCategory(range), getCategories()])

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

type LedgerRow = { date: string; amount: number; type: string }

async function fetchNetLedgerRows(range: DateRange) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('transactions')
    .select('date, amount, type')
    .eq('user_id', userData.user.id)
    .in('type', ['expense', 'reimbursement'])
    .gte('date', range.start)
    .lte('date', range.end)
}

// Net per bucket (expenses minus reimbursements), same approach as the
// monthly total - just grouped by whatever key the caller derives from each
// row's date (exact day, month, or year). See
// docs/adr/001-net-category-spend-calculation.md.
function netByBucketKey(rows: LedgerRow[], keyFn: (date: string) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((totals, row) => {
    const key = keyFn(row.date)
    const delta = row.type === 'expense' ? row.amount : -row.amount
    totals[key] = (totals[key] ?? 0) + delta
    return totals
  }, {})
}

export async function getDailySpending(range: DateRange) {
  const { data, error } = await fetchNetLedgerRows(range)

  if (error) return { data: null, error }

  const netByDate = netByBucketKey((data ?? []) as LedgerRow[], (date) => date)

  const dailySpending: DailySpending[] = Object.entries(netByDate)
    .map(([date, amount]) => ({ date, amount: Math.max(amount, 0) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return { data: dailySpending, error: null }
}

export interface TrendPoint {
  date: string
  amount: number
}

const TREND_DAYS = 30
const TREND_MONTHS = 12
const TREND_YEARS = 5

// A rolling window of buckets (last 30 days / 12 months / 5 years), distinct
// from getPeriodRange's current-vs-previous single period. Every bucket in
// the window is included even when it has no activity, so the chart shows a
// true, evenly-spaced trend line instead of skipping quiet periods.
export async function getTrendData(periodType: PeriodType) {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  if (periodType === 'day') {
    const start = new Date(todayUtc)
    start.setUTCDate(start.getUTCDate() - (TREND_DAYS - 1))

    const { data, error } = await fetchNetLedgerRows({ start: toIsoDate(start), end: toIsoDate(todayUtc) })
    if (error) return { data: null, error }

    const netByDate = netByBucketKey((data ?? []) as LedgerRow[], (date) => date)

    const trend: TrendPoint[] = Array.from({ length: TREND_DAYS }, (_, i) => {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + i)
      const iso = toIsoDate(date)
      return { date: iso, amount: Math.max(netByDate[iso] ?? 0, 0) }
    })

    return { data: trend, error: null }
  }

  if (periodType === 'year') {
    const startYear = todayUtc.getUTCFullYear() - (TREND_YEARS - 1)
    const range: DateRange = {
      start: toIsoDate(new Date(Date.UTC(startYear, 0, 1))),
      end: toIsoDate(new Date(Date.UTC(todayUtc.getUTCFullYear(), 11, 31))),
    }

    const { data, error } = await fetchNetLedgerRows(range)
    if (error) return { data: null, error }

    const netByYear = netByBucketKey((data ?? []) as LedgerRow[], (date) => date.slice(0, 4))

    const trend: TrendPoint[] = Array.from({ length: TREND_YEARS }, (_, i) => {
      const year = startYear + i
      return { date: toIsoDate(new Date(Date.UTC(year, 0, 1))), amount: Math.max(netByYear[String(year)] ?? 0, 0) }
    })

    return { data: trend, error: null }
  }

  const startMonth = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - (TREND_MONTHS - 1), 1))
  const range: DateRange = {
    start: toIsoDate(startMonth),
    end: toIsoDate(new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, 0))),
  }

  const { data, error } = await fetchNetLedgerRows(range)
  if (error) return { data: null, error }

  const netByMonth = netByBucketKey((data ?? []) as LedgerRow[], (date) => date.slice(0, 7))

  const trend: TrendPoint[] = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const date = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1))
    const key = toIsoDate(date).slice(0, 7)
    return { date: toIsoDate(date), amount: Math.max(netByMonth[key] ?? 0, 0) }
  })

  return { data: trend, error: null }
}

export interface PeriodComparisonCategory {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  currentAmount: number
  previousAmount: number
  percentChange: number | null
}

export interface PeriodComparison {
  currentTotal: number
  previousTotal: number
  totalPercentChange: number | null
  categories: PeriodComparisonCategory[]
  hasPreviousData: boolean
}

export async function getPeriodComparison(periodType: PeriodType) {
  const { current, previous } = getPeriodRange(periodType, new Date())

  const [
    { data: currentStats, error: currentStatsError },
    { data: previousStats, error: previousStatsError },
    { data: currentCategories, error: currentCategoriesError },
    { data: previousCategories, error: previousCategoriesError },
  ] = await Promise.all([
    getMonthlyStats(current),
    getMonthlyStats(previous),
    getSpendingByCategory(current),
    getSpendingByCategory(previous),
  ])

  const error = currentStatsError || previousStatsError || currentCategoriesError || previousCategoriesError
  if (error) return { data: null, error }

  const hasPreviousData = !!previousStats && (previousStats.totalSpent > 0 || previousStats.totalIncome > 0)
  const previousByCategoryId = new Map((previousCategories ?? []).map((category) => [category.category_id, category]))
  const seenCategoryIds = new Set<string>()

  const categories: PeriodComparisonCategory[] = (currentCategories ?? []).map((category) => {
    seenCategoryIds.add(category.category_id)
    const previousAmount = previousByCategoryId.get(category.category_id)?.amount ?? 0

    return {
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      currentAmount: category.amount,
      previousAmount,
      percentChange: getPercentChange(category.amount, previousAmount),
    }
  })

  for (const category of previousCategories ?? []) {
    if (seenCategoryIds.has(category.category_id)) continue

    categories.push({
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      currentAmount: 0,
      previousAmount: category.amount,
      percentChange: getPercentChange(0, category.amount),
    })
  }

  const currentTotal = currentStats?.totalSpent ?? 0
  const previousTotal = previousStats?.totalSpent ?? 0

  const comparison: PeriodComparison = {
    currentTotal,
    previousTotal,
    totalPercentChange: getPercentChange(currentTotal, previousTotal),
    categories,
    hasPreviousData,
  }

  return { data: comparison, error: null }
}
