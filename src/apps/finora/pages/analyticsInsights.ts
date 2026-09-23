import type { TFunction } from 'i18next'
import { getCategoryDisplayName } from '@domain/category'
import type { PeriodComparison, PeriodComparisonCategory } from '@services/analyticsService'

const TOP_CHANGES_LIMIT = 2

// A bare number - the "%" sign belongs to the translation template
// ("{{percent}}%"), so each language controls where it goes.
function getPercentMagnitude(value: number) {
  return Math.round(Math.abs(value))
}

function buildCategoryInsight(t: TFunction, category: PeriodComparisonCategory & { percentChange: number }): string {
  const categoryName = getCategoryDisplayName(category, t)
  if (category.percentChange === 0) {
    return t('comparison.insights.categorySame', { category: categoryName })
  }
  const key = category.percentChange > 0 ? 'comparison.insights.categoryMore' : 'comparison.insights.categoryLess'
  return t(key, { percent: getPercentMagnitude(category.percentChange), category: categoryName })
}

function buildTotalInsight(t: TFunction, comparison: PeriodComparison): string | null {
  if (comparison.totalPercentChange === null) return null
  if (comparison.totalPercentChange === 0) return t('comparison.insights.totalSame')
  const key = comparison.totalPercentChange > 0 ? 'comparison.insights.totalMore' : 'comparison.insights.totalLess'
  return t(key, { percent: getPercentMagnitude(comparison.totalPercentChange) })
}

export function buildInsights(t: TFunction, comparison: PeriodComparison): string[] {
  const topChanges = comparison.categories
    .filter((category): category is PeriodComparisonCategory & { percentChange: number } => category.percentChange !== null)
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, TOP_CHANGES_LIMIT)

  const totalInsight = buildTotalInsight(t, comparison)

  return [...topChanges.map((category) => buildCategoryInsight(t, category)), ...(totalInsight ? [totalInsight] : [])]
}
