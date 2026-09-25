import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import { useAnalytics } from '@hooks/useAnalytics'
import { getPeriodRange, type DateRange, type PeriodType } from '@domain/analytics'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { StatCard } from '@molecules/StatCard/StatCard'
import { AsyncState } from '@molecules/AsyncState/AsyncState'
import { buildInsights } from './analyticsInsights'
import s from './Analytics.module.css'

const TOP_CATEGORIES_LIMIT = 3
// CSS custom properties, not literal colors, so the chart follows the
// active theme (light/dark) - both recharts' SVG attributes and inline
// style backgroundColor resolve var(...) against the cascade at paint time.
const NEUTRAL_CATEGORY_COLOR = 'var(--color-finora-icon-fallback-bg)'
const LINE_COLOR = 'var(--color-finora-primary)'
const GRID_COLOR = 'var(--color-finora-surface-muted)'

const PERIOD_OPTIONS: { value: PeriodType; labelKey: string }[] = [
  { value: 'day', labelKey: 'period.daily' },
  { value: 'month', labelKey: 'period.monthly' },
  { value: 'year', labelKey: 'period.yearly' },
]

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

export function Analytics() {
  const { t } = useTranslation(['analytics', 'categories'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const { stats, spendingByCategory, trendData, comparison, loading, error } = useAnalytics(periodType)

  const handlePeriodChange = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextPeriod = event.currentTarget.dataset.period as PeriodType | undefined
    if (nextPeriod) setPeriodType(nextPeriod)
  }, [])

  const formatChartValue = useCallback(
    // recharts' Tooltip may pass undefined (or an array for range series), so
    // only format values that are actually a single number.
    (value?: unknown) =>
      typeof value === 'number' || typeof value === 'string'
        ? formatCurrency(Number(value), currency, locale, { maximumFractionDigits: 0 })
        : '',
    [currency, locale]
  )

  const hasData =
    !!stats &&
    (stats.totalSpent > 0 || stats.totalCoveredBySavings > 0 || stats.totalDepositedToGoals > 0 || stats.totalIncome > 0)
  const topCategories = spendingByCategory.slice(0, TOP_CATEGORIES_LIMIT)
  const chartData = trendData.map((point) => ({
    ...point,
    label: formatTrendLabel(point.date, periodType),
  }))
  const periodLabel = useMemo(
    () => formatPeriodPillLabel(periodType, getPeriodRange(periodType, new Date()).current),
    [periodType]
  )
  const insights = comparison && comparison.hasPreviousData ? buildInsights(t, comparison) : []

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </div>
        <span className={s.periodPill}>{periodLabel}</span>
      </div>

      <div className={s.periodToggle} role="group" aria-label={t('period.ariaLabel')}>
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
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!hasData}
        loadingLabel={t('state.loading')}
        errorMessage={t('state.error')}
        emptyMessage={t('state.empty')}
        skeletonCount={4}
        skeletonWrapClassName={s.skeletonWrap}
        skeletonItemClassName={s.skeletonCard}
        boxed
      >
        {stats && (
          <>
            <div className={s.statGrid}>
              <StatCard
                testId="analytics-total-spent-stat"
                label={t('stats.totalSpent')}
                value={formatCurrency(stats.totalSpent, currency, locale, { maximumFractionDigits: 0 })}
              />
              <StatCard
                testId="analytics-avg-per-day-stat"
                label={t('stats.avgPerDay')}
                value={formatCurrency(stats.avgPerDay, currency, locale, { maximumFractionDigits: 0 })}
              />
              <StatCard
                testId="analytics-savings-rate-stat"
                label={t('stats.savingsRate')}
                value={formatPercentage(stats.savingsRate)}
                variant={stats.savingsRate >= 0 ? 'success' : 'danger'}
              />
              <StatCard
                testId="analytics-saved-to-goals-stat"
                label={t('stats.savedToGoals')}
                value={formatCurrency(stats.totalDepositedToGoals, currency, locale, { maximumFractionDigits: 0 })}
              />
            </div>
            {stats.totalCoveredBySavings > 0 && (
              <p className={s.savingsNote} data-testid="analytics-covered-by-savings-note">
                {t('stats.coveredBySavingsNote', {
                  amount: formatCurrency(stats.totalCoveredBySavings, currency, locale, { maximumFractionDigits: 0 }),
                })}
              </p>
            )}

            <div className={s.analyticsRow}>
              <div className={cn(s.card, s.chartCard)}>
                <h2 className={s.cardTitle}>{t('chart.title')}</h2>
                {chartData.length === 0 ? (
                  <p className={s.stateMessage}>{t('chart.empty')}</p>
                ) : (
                  <div className={s.chartWrap}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
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
                <h2 className={s.cardTitle}>{t('categoryBreakdown.title')}</h2>
                {spendingByCategory.length === 0 ? (
                  <p className={s.stateMessage}>{t('categoryBreakdown.empty')}</p>
                ) : (
                  <ul className={s.categoryList}>
                    {spendingByCategory.map((category) => (
                      <li key={category.category_id} className={s.categoryRow}>
                        <span
                          className={s.categoryDot}
                          style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                        />
                        <span className={s.categoryName}>{getCategoryDisplayName(category, t)}</span>
                        <span className={s.categoryPercentage}>{formatPercentage(category.percentage)}</span>
                        <span className={s.categoryAmount}>
                          {formatCurrency(category.amount, currency, locale, { maximumFractionDigits: 0 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>{t('topCategories.title')}</h2>
              {topCategories.length === 0 ? (
                <p className={s.stateMessage}>{t('topCategories.empty')}</p>
              ) : (
                <ul className={s.topCategoryList}>
                  {topCategories.map((category, index) => (
                    <li key={category.category_id} className={s.topCategoryRow}>
                      <span className={s.topCategoryRank}>{index + 1}</span>
                      <span
                        className={s.categoryDot}
                        style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                      />
                      <span className={s.categoryName}>{getCategoryDisplayName(category, t)}</span>
                      <span className={s.categoryAmount}>
                        {formatCurrency(category.amount, currency, locale, { maximumFractionDigits: 0 })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>{t('comparison.title')}</h2>
              {!comparison?.hasPreviousData ? (
                <p className={s.stateMessage}>{t('comparison.noPreviousData')}</p>
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
                        <span className={s.categoryName}>{getCategoryDisplayName(category, t)}</span>
                        <span className={s.comparisonAmounts}>
                          {formatCurrency(category.previousAmount, currency, locale, { maximumFractionDigits: 0 })} →{' '}
                          {formatCurrency(category.currentAmount, currency, locale, { maximumFractionDigits: 0 })}
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
                            ? t('comparison.new')
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
