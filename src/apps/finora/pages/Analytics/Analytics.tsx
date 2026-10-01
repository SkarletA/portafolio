import { useCallback, useMemo, useState, type MouseEvent } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import cn from 'clsx'
import { useAnalytics, type AnalyticsViewMode, type HouseholdTrendPoint } from '@hooks/useAnalytics'
import { getPeriodRange, type DateRange, type PeriodType } from '@domain/analytics'
import { buildCategoryBreakdown, getCategoryDisplayName, type Category } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { getHouseholdPartnerDisplayName } from '@domain/household'
import type { Currency } from '@domain/profile'
import { useCurrency } from '@context/CurrencyContext'
import { useHousehold } from '@context/HouseholdContext'
import { useLanguage } from '@context/LanguageContext'
import { StatCard } from '@molecules/StatCard/StatCard'
import { AsyncState } from '@molecules/AsyncState/AsyncState'
import { BudgetCardBreakdown } from '@molecules/BudgetCardBreakdown/BudgetCardBreakdown'
import type { CategorySpending, PeriodComparisonCategory } from '@services/analyticsService'
import { buildCategoryInsights, buildHouseholdTotalInsight, buildInsights } from './analyticsInsights'
import s from './Analytics.module.css'

const TOP_CATEGORIES_LIMIT = 3
// CSS custom properties, not literal colors, so the chart follows the
// active theme (light/dark) - both recharts' SVG attributes and inline
// style backgroundColor resolve var(...) against the cascade at paint time.
const NEUTRAL_CATEGORY_COLOR = 'var(--color-finora-icon-fallback-bg)'
const LINE_COLOR = 'var(--color-finora-primary)'
const GRID_COLOR = 'var(--color-finora-surface-muted)'
// The household view's two per-member colors, reused for the stacked trend
// bar's segments and (via ownerButtonActive's own token) kept consistent
// with the rest of the app - no new color tokens (ADR-011).
const OWN_COLOR = 'var(--color-finora-primary-dark)'
const PARTNER_COLOR = 'var(--color-finora-primary)'

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

interface CategorySpendListProps {
  categories: CategorySpending[]
  t: TFunction
  currency: Currency
  locale: string
  showRank?: boolean
  /**
   * When given together with `rawByCategory`, each row gets a collapsible
   * BudgetCardBreakdown for its subcategories (e.g. Housing -> Rent/
   * Services) - only passed for "Spending by category", not "Top spending
   * categories", which stays a plain glance-able list.
   */
  allCategories?: Category[]
  rawByCategory?: Record<string, number>
}

/** The Spending-by-category / Top-categories row shape, reused for the Mine view and for each member's column in the Household view (ADR-011). */
function CategorySpendList({ categories, t, currency, locale, showRank = false, allCategories, rawByCategory }: CategorySpendListProps) {
  return (
    <ul className={showRank ? s.topCategoryList : s.categoryList}>
      {categories.map((category, index) => {
        const displayName = getCategoryDisplayName(category, t)
        const breakdownItems =
          allCategories && rawByCategory ? buildCategoryBreakdown(category.category_id, allCategories, rawByCategory) : []

        return (
          <li key={category.category_id}>
            <div className={showRank ? s.topCategoryRow : s.categoryRow}>
              {showRank && <span className={s.topCategoryRank}>{index + 1}</span>}
              <span className={s.categoryDot} style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }} />
              <span className={s.categoryName}>{displayName}</span>
              {!showRank && <span className={s.categoryPercentage}>{formatPercentage(category.percentage)}</span>}
              <span className={s.categoryAmount}>{formatCurrency(category.amount, currency, locale)}</span>
            </div>
            {breakdownItems.length > 0 && (
              <BudgetCardBreakdown
                categoryId={category.category_id}
                categoryName={displayName}
                limit={category.amount}
                items={breakdownItems}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}

interface CategoryColumnProps extends Omit<CategorySpendListProps, 'categories'> {
  label: string
  categories: CategorySpending[]
  emptyMessage: string
  testId: string
}

/** One member's labeled column of CategorySpendList, or its own empty state - never blind-merged with the other member's (ADR-011). */
function CategoryColumn({ label, categories, emptyMessage, testId, ...listProps }: CategoryColumnProps) {
  return (
    <div data-testid={testId}>
      <h3 className={s.columnLabel}>{label}</h3>
      {categories.length === 0 ? (
        <p className={s.stateMessage}>{emptyMessage}</p>
      ) : (
        <CategorySpendList categories={categories} {...listProps} />
      )}
    </div>
  )
}

interface ComparisonCategoryListProps {
  categories: PeriodComparisonCategory[]
  t: TFunction
  currency: Currency
  locale: string
}

/** The comparison table's rows (previous → current, % change), reused for the Mine view and for each member's column in the Household view. */
function ComparisonCategoryList({ categories, t, currency, locale }: ComparisonCategoryListProps) {
  return (
    <ul className={s.comparisonList}>
      {categories.map((category) => (
        <li key={category.category_id} className={s.comparisonRow}>
          <span className={s.categoryDot} style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }} />
          <span className={s.categoryName}>{getCategoryDisplayName(category, t)}</span>
          <span className={s.comparisonAmounts}>
            {formatCurrency(category.previousAmount, currency, locale)} → {formatCurrency(category.currentAmount, currency, locale)}
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
  )
}

export function Analytics() {
  const { t } = useTranslation(['analytics', 'categories'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const { ownMember, partnerMember, partner } = useHousehold()
  const partnerName = getHouseholdPartnerDisplayName(partner) ?? ''
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('mine')
  const {
    stats,
    spendingByCategory,
    trendData,
    comparison,
    categories: allCategories,
    rawByCategory,
    householdBreakdown,
    householdRaw,
    householdTrend,
    householdComparison,
    isHouseholdView,
    loading,
    error,
  } = useAnalytics(periodType, viewMode)

  // Both sides accepted (ADR-007), same condition Transactions uses for its
  // own Mine/Household tabs - otherwise there is nothing to combine a toggle
  // over.
  const isHouseholdActive = ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'

  const handlePeriodChange = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextPeriod = event.currentTarget.dataset.period as PeriodType | undefined
    if (nextPeriod) setPeriodType(nextPeriod)
  }, [])

  const handleViewModeClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextViewMode = event.currentTarget.dataset.viewMode as AnalyticsViewMode | undefined
    if (nextViewMode) setViewMode(nextViewMode)
  }, [])

  const formatChartValue = useCallback(
    // recharts' Tooltip may pass undefined (or an array for range series), so
    // only format values that are actually a single number.
    (value?: unknown) =>
      typeof value === 'number' || typeof value === 'string'
        ? formatCurrency(Number(value), currency, locale)
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
  const householdChartData = householdTrend.map((point: HouseholdTrendPoint) => ({
    ...point,
    label: formatTrendLabel(point.date, periodType),
  }))
  const periodLabel = useMemo(
    () => formatPeriodPillLabel(periodType, getPeriodRange(periodType, new Date()).current),
    [periodType]
  )

  const insights = comparison && comparison.hasPreviousData ? buildInsights(t, comparison) : []
  const householdInsights =
    householdComparison && householdComparison.hasPreviousData
      ? [
          ...buildCategoryInsights(t, householdComparison.own, 'own'),
          ...buildCategoryInsights(t, householdComparison.partner, 'other', partnerName),
          ...(buildHouseholdTotalInsight(t, householdComparison.totalPercentChange)
            ? [buildHouseholdTotalInsight(t, householdComparison.totalPercentChange) as string]
            : []),
        ]
      : []

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </div>
        <span className={s.periodPill}>{periodLabel}</span>
      </div>

      {isHouseholdActive && (
        <div className={s.ownerToggle} role="group" aria-label={t('tabs.ariaLabel')}>
          <button
            type="button"
            data-view-mode="mine"
            aria-pressed={viewMode === 'mine'}
            onClick={handleViewModeClick}
            className={cn(s.ownerButton, viewMode === 'mine' && s.ownerButtonActive)}
            data-testid="analytics-tab-mine-button"
          >
            {t('tabs.mine')}
          </button>
          <button
            type="button"
            data-view-mode="household"
            aria-pressed={viewMode === 'household'}
            onClick={handleViewModeClick}
            className={cn(s.ownerButton, viewMode === 'household' && s.ownerButtonActive)}
            data-testid="analytics-tab-household-button"
          >
            {t('tabs.household')}
          </button>
        </div>
      )}

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
                value={formatCurrency(stats.totalSpent, currency, locale)}
              />
              <StatCard
                testId="analytics-avg-per-day-stat"
                label={t('stats.avgPerDay')}
                value={formatCurrency(stats.avgPerDay, currency, locale)}
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
                value={formatCurrency(stats.totalDepositedToGoals, currency, locale)}
              />
            </div>
            {stats.totalCoveredBySavings > 0 && (
              <p className={s.savingsNote} data-testid="analytics-covered-by-savings-note">
                {t('stats.coveredBySavingsNote', {
                  amount: formatCurrency(stats.totalCoveredBySavings, currency, locale),
                })}
              </p>
            )}

            <div className={s.analyticsRow}>
              <div className={cn(s.card, s.chartCard)}>
                <h2 className={s.cardTitle}>{t('chart.title')}</h2>
                {isHouseholdView ? (
                  householdChartData.length === 0 ? (
                    <p className={s.stateMessage}>{t('chart.empty')}</p>
                  ) : (
                    <div className={s.chartWrap}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={householdChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={formatChartValue} />
                          <Tooltip formatter={formatChartValue} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="own" stackId="household" fill={OWN_COLOR} name={t('columns.own')} />
                          <Bar dataKey="partner" stackId="household" fill={PARTNER_COLOR} name={partnerName} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                ) : chartData.length === 0 ? (
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
                {isHouseholdView ? (
                  <div className={s.columns}>
                    <CategoryColumn
                      label={t('columns.own')}
                      categories={householdBreakdown?.own ?? []}
                      emptyMessage={t('categoryBreakdown.empty')}
                      testId="analytics-breakdown-own-column"
                      t={t}
                      currency={currency}
                      locale={locale}
                      allCategories={allCategories}
                      rawByCategory={householdRaw?.own}
                    />
                    <CategoryColumn
                      label={partnerName}
                      categories={householdBreakdown?.partner ?? []}
                      emptyMessage={t('categoryBreakdown.empty')}
                      testId="analytics-breakdown-partner-column"
                      t={t}
                      currency={currency}
                      locale={locale}
                      allCategories={allCategories}
                      rawByCategory={householdRaw?.partner}
                    />
                  </div>
                ) : spendingByCategory.length === 0 ? (
                  <p className={s.stateMessage}>{t('categoryBreakdown.empty')}</p>
                ) : (
                  <CategorySpendList
                    categories={spendingByCategory}
                    t={t}
                    currency={currency}
                    locale={locale}
                    allCategories={allCategories}
                    rawByCategory={rawByCategory}
                  />
                )}
              </div>
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>{t('topCategories.title')}</h2>
              {isHouseholdView ? (
                <div className={s.columns}>
                  <CategoryColumn
                    label={t('columns.own')}
                    categories={(householdBreakdown?.own ?? []).slice(0, TOP_CATEGORIES_LIMIT)}
                    emptyMessage={t('topCategories.empty')}
                    testId="analytics-top-own-column"
                    showRank
                    t={t}
                    currency={currency}
                    locale={locale}
                  />
                  <CategoryColumn
                    label={partnerName}
                    categories={(householdBreakdown?.partner ?? []).slice(0, TOP_CATEGORIES_LIMIT)}
                    emptyMessage={t('topCategories.empty')}
                    testId="analytics-top-partner-column"
                    showRank
                    t={t}
                    currency={currency}
                    locale={locale}
                  />
                </div>
              ) : topCategories.length === 0 ? (
                <p className={s.stateMessage}>{t('topCategories.empty')}</p>
              ) : (
                <CategorySpendList categories={topCategories} t={t} currency={currency} locale={locale} showRank />
              )}
            </div>

            <div className={s.card}>
              <h2 className={s.cardTitle}>{t('comparison.title')}</h2>
              {isHouseholdView ? (
                !householdComparison?.hasPreviousData ? (
                  <p className={s.stateMessage}>{t('comparison.noPreviousData')}</p>
                ) : (
                  <>
                    {householdInsights.length > 0 && (
                      <ul className={s.insightList}>
                        {householdInsights.map((insight) => (
                          <li key={insight} className={s.insightRow}>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className={s.columns}>
                      <div data-testid="analytics-comparison-own-column">
                        <h3 className={s.columnLabel}>{t('columns.own')}</h3>
                        <ComparisonCategoryList categories={householdComparison.own} t={t} currency={currency} locale={locale} />
                      </div>
                      <div data-testid="analytics-comparison-partner-column">
                        <h3 className={s.columnLabel}>{partnerName}</h3>
                        <ComparisonCategoryList
                          categories={householdComparison.partner}
                          t={t}
                          currency={currency}
                          locale={locale}
                        />
                      </div>
                    </div>
                  </>
                )
              ) : !comparison?.hasPreviousData ? (
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

                  <ComparisonCategoryList categories={comparison.categories} t={t} currency={currency} locale={locale} />
                </>
              )}
            </div>
          </>
        )}
      </AsyncState>
    </section>
  )
}
