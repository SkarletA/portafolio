import { supabase } from './supabaseClient'
import { getExpensesByCategory, getHouseholdAttributedEntries } from './transactionsService'
import { getCategories } from './categoriesService'
import { catchServiceErrors } from './catchServiceErrors'
import {
  getAveragePerDay,
  getCategoryPercentage,
  getPercentChange,
  getPeriodRange,
  getSavingsRate,
  type DateRange,
  type PeriodType,
} from '@domain/analytics'
import { getGrossSpendByCategory, getRawGrossSpendByCategory, type Category } from '@domain/category'
import { expandLedgerRowsInRange, isIncomeFundedExpense, isIncomeFundedReimbursement } from '@domain/installments'
import { getLocalCalendarDate } from '@domain/date'
import { addMoney, sumMoney, subtractMoney } from '@domain/money'
import type { FundingSource, TransactionType } from '@domain/transaction'

export interface MonthlyStats {
  totalSpent: number
  /** Expenses covered by savings: left out of totalSpent and savingsRate, reported on their own. */
  totalCoveredBySavings: number
  /** Money moved into Goals as deposits in the period (not opening balances or withdrawals). */
  totalDepositedToGoals: number
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
  const todayUtc = getLocalCalendarDate()
  const effectiveEnd = todayUtc < endDate ? todayUtc : endDate

  return Math.max(Math.round((effectiveEnd.getTime() - startDate.getTime()) / 86400000) + 1, 0)
}

export interface LedgerTotals {
  totalSpent: number
  totalCoveredBySavings: number
  totalIncome: number
  totalReimbursed: number
}

// Adds each row's amount to the total for its kind, exactly (ADR-005). A
// reimbursement linked to a savings-funded purchase returns to the Goal, so it
// is in none of the totals - and must never fall through to income. See
// docs/adr/006-reimbursement-purchase-links.md.
export function sumLedgerTotals(
  rows: { type: TransactionType; funding_source: FundingSource; amount: number }[]
): LedgerTotals {
  return rows.reduce<LedgerTotals>(
    (acc, row) => {
      if (isIncomeFundedExpense(row)) {
        acc.totalSpent = addMoney(acc.totalSpent, row.amount)
      } else if (row.type === 'expense') {
        acc.totalCoveredBySavings = addMoney(acc.totalCoveredBySavings, row.amount)
      } else if (row.type === 'reimbursement') {
        if (isIncomeFundedReimbursement(row)) acc.totalReimbursed = addMoney(acc.totalReimbursed, row.amount)
      } else {
        acc.totalIncome = addMoney(acc.totalIncome, row.amount)
      }
      return acc
    },
    { totalSpent: 0, totalCoveredBySavings: 0, totalIncome: 0, totalReimbursed: 0 }
  )
}

// householdMemberIds: when given (both members accepted - ADR-007), combines
// every member's transactions and goal deposits instead of only the caller's
// own - ADR-011's "full visibility, no tagging" for Analytics/Dashboard.
// Omitted or empty, behaves exactly as before.
export function getMonthlyStats(range: DateRange, householdMemberIds?: string[]) {
  return catchServiceErrors(() => loadMonthlyStats(range, householdMemberIds))
}

async function loadMonthlyStats(range: DateRange, householdMemberIds?: string[]) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const userIds = householdMemberIds && householdMemberIds.length > 0 ? householdMemberIds : [userData.user.id]

  const [{ data, error }, { data: deposits, error: depositsError }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, date, installment_months, funding_source')
      .in('user_id', userIds)
      .lte('date', range.end)
      .gte('last_installment_date', range.start),
    // Deposits are money kept, not spent: they lower the spendable balance
    // but never the savings rate. See docs/adr/004-goal-transfers.md.
    supabase
      .from('goal_transfers')
      .select('amount')
      .in('user_id', userIds)
      .eq('kind', 'deposit')
      .gte('date', range.start)
      .lte('date', range.end),
  ])

  if (error) return { data: null, error }
  if (depositsError) return { data: null, error: depositsError }

  // totalSpent is gross (expenses only, never floored - see
  // docs/adr/002-gross-spend-and-effective-limit.md). totalReimbursed is kept
  // separate and never shown; it exists only to net against totalSpent for
  // savingsRate, which answers "how much did I actually keep" rather than
  // "how much did I charge as expenses." Financed purchases count one
  // installment per month, and expenses covered by savings go to
  // totalCoveredBySavings instead of totalSpent - see
  // docs/adr/003-installments-and-savings-funding.md.
  const totals = sumLedgerTotals(expandLedgerRowsInRange(data ?? [], range))

  const netSpentForSavings = subtractMoney(totals.totalSpent, totals.totalReimbursed)

  const stats: MonthlyStats = {
    totalSpent: totals.totalSpent,
    totalCoveredBySavings: totals.totalCoveredBySavings,
    totalDepositedToGoals: sumMoney((deposits ?? []).map((deposit) => deposit.amount)),
    totalIncome: totals.totalIncome,
    avgPerDay: getAveragePerDay(totals.totalSpent, daysElapsedInRange(range)),
    savingsRate: getSavingsRate(totals.totalIncome, netSpentForSavings),
  }

  return { data: stats, error: null }
}

export interface CategorySpending {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  translationKey: string | null
  amount: number
  percentage: number
}

// Only top-level categories are listed: each one's amount already includes
// its subcategories via getGrossSpendByCategory's rollup, so listing children
// as separate rows too would double-count spend and push percentages past
// 100%. Exported so a per-member household list (ADR-011) can be built the
// same way from pre-attributed totals, not a second implementation.
export function buildCategorySpending(totals: Record<string, number>, categories: Category[]): CategorySpending[] {
  const topLevelCategories = categories.filter((category) => !category.parent_id)
  const totalSpent = sumMoney(topLevelCategories.map((category) => totals[category.id] ?? 0))

  return topLevelCategories
    .map((category) => {
      const amount = totals[category.id] ?? 0
      return {
        category_id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        translationKey: category.translationKey,
        amount,
        percentage: getCategoryPercentage(amount, totalSpent),
      }
    })
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount)
}

export function getSpendingByCategory(range: DateRange, householdMemberIds?: string[]) {
  return catchServiceErrors(() => loadSpendingByCategory(range, householdMemberIds))
}

async function loadSpendingByCategory(range: DateRange, householdMemberIds?: string[]) {
  const [{ data: expensesByCategory, error: expensesError }, { data: categoriesData, error: categoriesError }] =
    await Promise.all([getExpensesByCategory(range, householdMemberIds), getCategories()])

  const error = expensesError || categoriesError
  if (error) return { data: null, error }

  const categories = (categoriesData ?? []) as Category[]

  return { data: buildCategorySpending(expensesByCategory?.totals ?? {}, categories), error: null }
}

export interface HouseholdCategorySpending {
  own: CategorySpending[]
  partner: CategorySpending[]
  /** Each member's un-rolled-up per-category spend, for a subcategory breakdown (e.g. Housing -> Rent/Services). */
  ownRaw: Record<string, number>
  partnerRaw: Record<string, number>
}

// The household view's Spending-by-category / Top-categories / Comparison
// data: each member's *tagged* (Case A share or Case B, ADR-010) spend,
// never a blind merge - reuses the same getHouseholdAttributedEntries both
// the household budget (PR8) and this function build on, so a split
// transaction (e.g. rent $14,700 split $5,200/$9,500) attributes correctly
// here too, not just in Budgets. See
// docs/adr/011-household-combined-analytics.md.
export function getHouseholdSpendingByCategory(range: DateRange, members: { ownId: string; partnerId: string }) {
  return catchServiceErrors(() => loadHouseholdSpendingByCategory(range, members))
}

async function loadHouseholdSpendingByCategory(range: DateRange, members: { ownId: string; partnerId: string }) {
  const [{ data: attributed, error: attributedError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
    getHouseholdAttributedEntries(range, members),
    getCategories(),
  ])

  if (attributedError) return { data: null, error: attributedError }
  if (categoriesError) return { data: null, error: categoriesError }

  const categories = (categoriesData ?? []) as Category[]
  const ownEntries = attributed?.own ?? []
  const partnerEntries = attributed?.partner ?? []

  const data: HouseholdCategorySpending = {
    own: buildCategorySpending(getGrossSpendByCategory(ownEntries, categories), categories),
    partner: buildCategorySpending(getGrossSpendByCategory(partnerEntries, categories), categories),
    ownRaw: getRawGrossSpendByCategory(ownEntries),
    partnerRaw: getRawGrossSpendByCategory(partnerEntries),
  }

  return { data, error: null }
}

export interface DailySpending {
  date: string
  amount: number
}

export type LedgerRow = {
  date: string
  amount: number
  type: 'expense' | 'reimbursement'
  installment_months: number
  funding_source: FundingSource
}

// Rows already expanded into the installments that fall in the range, so a
// financed purchase lands one installment per bucket on its own date.
// householdMemberIds widens to every member's rows (ADR-011), same as above.
async function fetchExpenseAndReimbursementRows(range: DateRange, householdMemberIds?: string[]) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const userIds = householdMemberIds && householdMemberIds.length > 0 ? householdMemberIds : [userData.user.id]

  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount, type, installment_months, funding_source')
    .in('user_id', userIds)
    .in('type', ['expense', 'reimbursement'])
    .lte('date', range.end)
    .gte('last_installment_date', range.start)

  if (error) return { data: null, error }

  return { data: expandLedgerRowsInRange((data ?? []) as LedgerRow[], range), error: null }
}

// Gross spend per bucket (expense amounts only, never floored - a sum of
// non-negative amounts can't go negative), grouped by whatever key the
// caller derives from each row's date (exact day, month, or year). Moves in
// lockstep with getMonthlyStats' totalSpent so the trend chart always agrees
// with "Total spent", including leaving out expenses covered by savings.
// Takes the minimal row shape (not LedgerRow itself) so a household member's
// already-attributed entries (which carry no installment_months - expansion
// already happened) can be rolled up the same way. See
// docs/adr/002-gross-spend-and-effective-limit.md and
// docs/adr/003-installments-and-savings-funding.md.
export function grossSpendByBucketKey(
  rows: { date: string; amount: number; type: TransactionType; funding_source: FundingSource }[],
  keyFn: (date: string) => string
): Record<string, number> {
  return rows.reduce<Record<string, number>>((totals, row) => {
    if (!isIncomeFundedExpense(row)) return totals

    const key = keyFn(row.date)
    totals[key] = addMoney(totals[key] ?? 0, row.amount)
    return totals
  }, {})
}

export function getDailySpending(range: DateRange, householdMemberIds?: string[]) {
  return catchServiceErrors(() => loadDailySpending(range, householdMemberIds))
}

async function loadDailySpending(range: DateRange, householdMemberIds?: string[]) {
  const { data, error } = await fetchExpenseAndReimbursementRows(range, householdMemberIds)

  if (error) return { data: null, error }

  const grossByDate = grossSpendByBucketKey(data ?? [], (date) => date)

  const dailySpending: DailySpending[] = Object.entries(grossByDate)
    .map(([date, amount]) => ({ date, amount }))
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

interface TrendWindow {
  range: DateRange
  keyFn: (date: string) => string
  /** Every bucket's date in the window, even ones with no activity - so a trend never skips a quiet period. */
  bucketDates: string[]
}

// The rolling window's range, date-to-bucket-key function, and the list of
// every bucket in it (last 30 days / 12 months / 5 years), distinct from
// getPeriodRange's current-vs-previous single period. The day/month/year
// window math in one place, shared by the self-only and household-combined
// trend (ADR-011) so they can never drift into different bucket boundaries.
function getTrendWindow(periodType: PeriodType): TrendWindow {
  const todayUtc = getLocalCalendarDate()

  if (periodType === 'day') {
    const start = new Date(todayUtc)
    start.setUTCDate(start.getUTCDate() - (TREND_DAYS - 1))

    const bucketDates = Array.from({ length: TREND_DAYS }, (_, i) => {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + i)
      return toIsoDate(date)
    })

    return {
      range: { start: toIsoDate(start), end: toIsoDate(todayUtc) },
      keyFn: (date) => date,
      bucketDates,
    }
  }

  if (periodType === 'year') {
    const startYear = todayUtc.getUTCFullYear() - (TREND_YEARS - 1)
    const bucketDates = Array.from({ length: TREND_YEARS }, (_, i) => toIsoDate(new Date(Date.UTC(startYear + i, 0, 1))))

    return {
      range: {
        start: toIsoDate(new Date(Date.UTC(startYear, 0, 1))),
        end: toIsoDate(new Date(Date.UTC(todayUtc.getUTCFullYear(), 11, 31))),
      },
      keyFn: (date) => date.slice(0, 4),
      bucketDates,
    }
  }

  const startMonth = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - (TREND_MONTHS - 1), 1))
  const bucketDates = Array.from({ length: TREND_MONTHS }, (_, i) =>
    toIsoDate(new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + i, 1)))
  )

  return {
    range: {
      start: toIsoDate(startMonth),
      end: toIsoDate(new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, 0))),
    },
    keyFn: (date) => date.slice(0, 7),
    bucketDates,
  }
}

export function getTrendData(periodType: PeriodType, householdMemberIds?: string[]) {
  return catchServiceErrors(() => loadTrendData(periodType, householdMemberIds))
}

async function loadTrendData(periodType: PeriodType, householdMemberIds?: string[]) {
  const { range, keyFn, bucketDates } = getTrendWindow(periodType)

  const { data, error } = await fetchExpenseAndReimbursementRows(range, householdMemberIds)
  if (error) return { data: null, error }

  const grossByKey = grossSpendByBucketKey(data ?? [], keyFn)
  const trend: TrendPoint[] = bucketDates.map((date) => ({ date, amount: grossByKey[keyFn(date)] ?? 0 }))

  return { data: trend, error: null }
}

export interface HouseholdTrendPoint {
  date: string
  own: number
  partner: number
}

// Each member's tagged spend per trend bucket (ADR-010's attribution,
// ADR-011's presentation rule) - fed into the stacked bar chart's two
// segments. Built on the same getHouseholdAttributedEntries and
// getTrendWindow the rest of this household view already uses.
export function getHouseholdTrendData(periodType: PeriodType, members: { ownId: string; partnerId: string }) {
  return catchServiceErrors(() => loadHouseholdTrendData(periodType, members))
}

async function loadHouseholdTrendData(periodType: PeriodType, members: { ownId: string; partnerId: string }) {
  const { range, keyFn, bucketDates } = getTrendWindow(periodType)

  const { data: attributed, error } = await getHouseholdAttributedEntries(range, members)
  if (error) return { data: null, error }

  const ownByKey = grossSpendByBucketKey(attributed?.own ?? [], keyFn)
  const partnerByKey = grossSpendByBucketKey(attributed?.partner ?? [], keyFn)

  const trend: HouseholdTrendPoint[] = bucketDates.map((date) => {
    const key = keyFn(date)
    return { date, own: ownByKey[key] ?? 0, partner: partnerByKey[key] ?? 0 }
  })

  return { data: trend, error: null }
}

export interface PeriodComparisonCategory {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  translationKey: string | null
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

// Matches each current-period category to its previous-period amount (0 when
// new) and vice versa (a category dropped to 0 still shows its previous
// amount, not disappears). Exported so a household-combined view (ADR-011)
// can build the same comparison per member instead of only once for a
// single merged list - same function, different (pre-filtered) inputs, the
// same reuse pattern ADR-010/011 already established for getGrossSpendByCategory.
export function buildCategoryComparison(
  currentCategories: CategorySpending[],
  previousCategories: CategorySpending[]
): PeriodComparisonCategory[] {
  const previousByCategoryId = new Map(previousCategories.map((category) => [category.category_id, category]))
  const seenCategoryIds = new Set<string>()

  const categories: PeriodComparisonCategory[] = currentCategories.map((category) => {
    seenCategoryIds.add(category.category_id)
    const previousAmount = previousByCategoryId.get(category.category_id)?.amount ?? 0

    return {
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      translationKey: category.translationKey,
      currentAmount: category.amount,
      previousAmount,
      percentChange: getPercentChange(category.amount, previousAmount),
    }
  })

  for (const category of previousCategories) {
    if (seenCategoryIds.has(category.category_id)) continue

    categories.push({
      category_id: category.category_id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      translationKey: category.translationKey,
      currentAmount: 0,
      previousAmount: category.amount,
      percentChange: getPercentChange(0, category.amount),
    })
  }

  return categories
}

export async function getPeriodComparison(periodType: PeriodType, householdMemberIds?: string[]) {
  const { current, previous } = getPeriodRange(periodType, new Date())

  const [
    { data: currentStats, error: currentStatsError },
    { data: previousStats, error: previousStatsError },
    { data: currentCategories, error: currentCategoriesError },
    { data: previousCategories, error: previousCategoriesError },
  ] = await Promise.all([
    getMonthlyStats(current, householdMemberIds),
    getMonthlyStats(previous, householdMemberIds),
    getSpendingByCategory(current, householdMemberIds),
    getSpendingByCategory(previous, householdMemberIds),
  ])

  const error = currentStatsError || previousStatsError || currentCategoriesError || previousCategoriesError
  if (error) return { data: null, error }

  const hasPreviousData = !!previousStats && (previousStats.totalSpent > 0 || previousStats.totalIncome > 0)
  const categories = buildCategoryComparison(currentCategories ?? [], previousCategories ?? [])

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
