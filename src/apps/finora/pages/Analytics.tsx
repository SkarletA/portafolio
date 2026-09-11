import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import cn from 'clsx'
import { useAnalytics } from '../hooks/useAnalytics'
import { StatCard } from '../components/molecules/StatCard/StatCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import s from './Analytics.module.css'

const TOP_CATEGORIES_LIMIT = 3
const NEUTRAL_CATEGORY_COLOR = '#94a3b8'
const LINE_COLOR = '#2563eb'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

const chartDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function formatPercentage(value: number) {
  return `${Math.round(value)}%`
}

function formatChartValue(value: number | string) {
  return currencyFormatter.format(Number(value))
}

export function Analytics() {
  const { stats, spendingByCategory, dailySpending, loading, error } = useAnalytics()

  const hasData = !!stats && (stats.totalSpent > 0 || stats.totalIncome > 0)
  const topCategories = spendingByCategory.slice(0, TOP_CATEGORIES_LIMIT)
  const chartData = dailySpending.map((point) => ({
    ...point,
    label: chartDateFormatter.format(new Date(point.date)),
  }))

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Analytics</h1>
          <p className={s.subtitle}>Understand where your money goes</p>
        </div>
        <span className={s.periodPill}>{monthFormatter.format(new Date())}</span>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!hasData}
        loadingLabel="Loading analytics…"
        errorMessage="We couldn't load your analytics. Please try again later."
        emptyMessage="No transactions recorded this month yet."
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
                  <p className={s.stateMessage}>No expenses recorded yet this month.</p>
                ) : (
                  <div className={s.chartWrap}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatChartValue} />
                        <Tooltip formatter={formatChartValue} />
                        <Line type="monotone" dataKey="amount" stroke={LINE_COLOR} strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={cn(s.card, s.sideCard)}>
                <h2 className={s.cardTitle}>Spending by category</h2>
                {spendingByCategory.length === 0 ? (
                  <p className={s.stateMessage}>No spending recorded this month.</p>
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
                <p className={s.stateMessage}>No spending recorded this month.</p>
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
          </>
        )}
      </AsyncState>
    </section>
  )
}
