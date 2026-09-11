import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import cn from 'clsx'
import { useAnalytics } from '../hooks/useAnalytics'
import { getPeriodRange, type DateRange, type PeriodType } from '../domain/analytics'
import type { PeriodComparison, PeriodComparisonCategory } from '../services/analyticsService'
import { StatCard } from '../components/molecules/StatCard/StatCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import s from './Analytics.module.css'

const TOP_CATEGORIES_LIMIT = 3
const TOP_CHANGES_LIMIT = 2
const NEUTRAL_CATEGORY_COLOR = '#94a3b8'
const LINE_COLOR = '#2563eb'

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
]

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayPillFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const yearPillFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' })

const dayLabelFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const monthLabelFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
const yearLabelFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' })

function formatPercentage(value: number) {
  return `${Math.round(value)}%`
}

function formatChartValue(value: number | string) {
  return currencyFormatter.format(Number(value))
}

function formatPeriodPillLabel(periodType: PeriodType, current: DateRange): string {
  const start = new Date(current.start)
  if (periodType === 'day') return dayPillFormatter.format(start)
  if (periodType === 'year') return yearPillFormatter.format(start)
  return monthFormatter.format(start)
}

function formatTrendLabel(date: string, periodType: PeriodType): string {
  const parsed = new Date(date)
  if (periodType === 'day') return dayLabelFormatter.format(parsed)
  if (periodType === 'year') return yearLabelFormatter.format(parsed)
  return monthLabelFormatter.format(parsed)
}

function formatPercentMagnitude(value: number) {
  return `${Math.round(Math.abs(value))}%`
}

function buildCategoryInsight(category: PeriodComparisonCategory & { percentChange: number }): string {
  if (category.percentChange === 0) return `Your spending on ${category.name} stayed the same as the previous period.`
  const direction = category.percentChange > 0 ? 'more' : 'less'
  return `You spent ${formatPercentMagnitude(category.percentChange)} ${direction} on ${category.name} than the previous period.`
}

function buildTotalInsight(comparison: PeriodComparison): string | null {
  if (comparison.totalPercentChange === null) return null
  if (comparison.totalPercentChange === 0) return 'Your total spending stayed the same as the previous period.'
  const direction = comparison.totalPercentChange > 0 ? 'more' : 'less'
  return `Overall, you spent ${formatPercentMagnitude(comparison.totalPercentChange)} ${direction} than the previous period.`
}

function buildInsights(comparison: PeriodComparison): string[] {
  const topChanges = comparison.categories
    .filter((category): category is PeriodComparisonCategory & { percentChange: number } => category.percentChange !== null)
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, TOP_CHANGES_LIMIT)

  const totalInsight = buildTotalInsight(comparison)

  return [...topChanges.map(buildCategoryInsight), ...(totalInsight ? [totalInsight] : [])]
}

export function Analytics() {
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const { stats, spendingByCategory, trendData, comparison, loading, error } = useAnalytics(periodType)

  const handlePeriodChange = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextPeriod = event.currentTarget.dataset.period as PeriodType | undefined
    if (nextPeriod) setPeriodType(nextPeriod)
  }, [])

  const hasData = !!stats && (stats.totalSpent > 0 || stats.totalIncome > 0)
  const topCategories = spendingByCategory.slice(0, TOP_CATEGORIES_LIMIT)
  const chartData = trendData.map((point) => ({
    ...point,
    label: formatTrendLabel(point.date, periodType),
  }))
  const periodLabel = useMemo(
    () => formatPeriodPillLabel(periodType, getPeriodRange(periodType, new Date()).current),
    [periodType]
  )
  const insights = comparison && comparison.hasPreviousData ? buildInsights(comparison) : []

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Analytics</h1>
          <p className={s.subtitle}>Understand where your money goes</p>
        </div>
        <span className={s.periodPill}>{periodLabel}</span>
      </div>

      <div className={s.periodToggle} role="group" aria-label="Analytics period">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            data-period={option.value}
            aria-pressed={periodType === option.value}
            onClick={handlePeriodChange}
            className={cn(s.periodButton, periodType === option.value && s.periodButtonActive)}
            data-testid={`analytics-period-${option.value}-button`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!hasData}
        loadingLabel="Loading analytics…"
        errorMessage="We couldn't load your analytics. Please try again later."
        emptyMessage="No transactions recorded for this period yet."
        skeletonCount={3}
        skeletonWrapClassName={s.skeletonWrap}
        skeletonItemClassName={s.skeletonCard}
        boxed
      >
        {stats && (
          <>
            <div className={s.statGrid}>
              <StatCard
                testId="analytics-total-spent-stat"
                label="Total spent"
                value={currencyFormatter.format(stats.totalSpent)}
              />
              <StatCard
                testId="analytics-avg-per-day-stat"
                label="Average per day"
                value={currencyFormatter.format(stats.avgPerDay)}
              />
              <StatCard
                testId="analytics-savings-rate-stat"
                label="Savings rate"
                value={formatPercentage(stats.savingsRate)}
                variant={stats.savingsRate >= 0 ? 'success' : 'danger'}
              />
            </div>

            <div className={s.analyticsRow}>
              <div className={cn(s.card, s.chartCard)}>
                <h2 className={s.cardTitle}>Spending over time</h2>
                {chartData.length === 0 ? (
                  <p className={s.stateMessage}>No expenses recorded yet for this period.</p>
                ) : (
                  <div className={s.chartWrap}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatChartValue} />
                        <Tooltip formatter={formatChartValue} />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke={LINE_COLOR}
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: LINE_COLOR, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={cn(s.card, s.sideCard)}>
                <h2 className={s.cardTitle}>Spending by category</h2>
                {spendingByCategory.length === 0 ? (
                  <p className={s.stateMessage}>No spending recorded for this period.</p>
                ) : (
                  <ul className={s.categoryList}>
                    {spendingByCategory.map((category) => (
                      <li key={category.category_id} className={s.categoryRow}>
                        <span
                          className={s.categoryDot}
                          style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                        />
                        <span className={s.categoryName}>{category.name}</span>
                        <span className={s.categoryPercentage}>{formatPercentage(category.percentage)}</span>
                        <span className={s.categoryAmount}>{currencyFormatter.format(category.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>Top spending categories</h2>
              {topCategories.length === 0 ? (
                <p className={s.stateMessage}>No spending recorded for this period.</p>
              ) : (
                <ul className={s.topCategoryList}>
                  {topCategories.map((category, index) => (
                    <li key={category.category_id} className={s.topCategoryRow}>
                      <span className={s.topCategoryRank}>{index + 1}</span>
                      <span
                        className={s.categoryDot}
                        style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                      />
                      <span className={s.categoryName}>{category.name}</span>
                      <span className={s.categoryAmount}>{currencyFormatter.format(category.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>Comparison</h2>
              {!comparison?.hasPreviousData ? (
                <p className={s.stateMessage}>No previous period data to compare.</p>
              ) : (
                <>
                  {insights.length > 0 && (
                    <ul className={s.insightList}>
                      {insights.map((insight) => (
                        <li key={insight} className={s.insightRow}>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  )}

                  <ul className={s.comparisonList}>
                    {comparison.categories.map((category) => (
                      <li key={category.category_id} className={s.comparisonRow}>
                        <span
                          className={s.categoryDot}
                          style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                        />
                        <span className={s.categoryName}>{category.name}</span>
                        <span className={s.comparisonAmounts}>
                          {currencyFormatter.format(category.previousAmount)} → {currencyFormatter.format(category.currentAmount)}
                        </span>
                        <span
                          className={cn(
                            s.comparisonChange,
                            category.percentChange === null && s.comparisonChangeNew,
                            category.percentChange !== null && category.percentChange > 0 && s.comparisonChangeUp,
                            category.percentChange !== null && category.percentChange < 0 && s.comparisonChangeDown
                          )}
                        >
                          {category.percentChange === null
                            ? 'New'
                            : `${category.percentChange > 0 ? '+' : ''}${Math.round(category.percentChange)}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </AsyncState>
    </section>
  )
}
