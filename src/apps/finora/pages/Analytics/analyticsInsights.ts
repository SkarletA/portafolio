import type { TFunction } from 'i18next'
import { getCategoryDisplayName } from '@domain/category'
import type { PeriodComparison, PeriodComparisonCategory } from '@services/analyticsService'

const TOP_CHANGES_LIMIT = 2

// A bare number - the "%" sign belongs to the translation template
// ("{{percent}}%"), so each language controls where it goes.
function getPercentMagnitude(value: number) {
  return Math.round(Math.abs(value))
}

/**
 * 'own' phrases in 2nd person ("Tú gastaste…"/"You spent…"), 'other' in 3rd
 * person with the member's name ("Dana gastó…"/"Dana spent…") - these are
 * different sentences, not one template with a swapped-in name, because
 * Spanish conjugates by grammatical person. Used for a household view's
 * per-member category insights (ADR-011); 'own' alone is what buildInsights
 * already used for the single-person view.
 */
export type InsightSubject = 'own' | 'other'

function buildCategoryInsight(
  t: TFunction,
  category: PeriodComparisonCategory & { percentChange: number },
  subject: InsightSubject,
  name?: string
): string {
  const categoryName = getCategoryDisplayName(category, t)

  if (category.percentChange === 0) {
    return subject === 'own'
      ? t('comparison.insights.categorySame', { category: categoryName })
      : t('comparison.insights.categorySameOther', { name, category: categoryName })
  }

  const more = category.percentChange > 0
  const key =
    subject === 'own'
      ? more
        ? 'comparison.insights.categoryMore'
        : 'comparison.insights.categoryLess'
      : more
        ? 'comparison.insights.categoryMoreOther'
        : 'comparison.insights.categoryLessOther'

  return t(key, { percent: getPercentMagnitude(category.percentChange), category: categoryName, name })
}

/** Up to `TOP_CHANGES_LIMIT` category insights, largest change first. */
export function buildCategoryInsights(
  t: TFunction,
  categories: PeriodComparisonCategory[],
  subject: InsightSubject = 'own',
  name?: string
): string[] {
  return categories
    .filter((category): category is PeriodComparisonCategory & { percentChange: number } => category.percentChange !== null)
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, TOP_CHANGES_LIMIT)
    .map((category) => buildCategoryInsight(t, category, subject, name))
}

// 'household' is a third, impersonal phrasing ("Overall, the household
// spent…") distinct from InsightSubject's 'own'/'other' - a total has no
// single grammatical person to pick for two people, unlike a per-member
// category insight.
function buildTotalInsight(t: TFunction, totalPercentChange: number | null, variant: 'own' | 'household'): string | null {
  if (totalPercentChange === null) return null
  if (totalPercentChange === 0) {
    return t(variant === 'own' ? 'comparison.insights.totalSame' : 'comparison.insights.totalSameHousehold')
  }
  const more = totalPercentChange > 0
  const key =
    variant === 'own'
      ? more
        ? 'comparison.insights.totalMore'
        : 'comparison.insights.totalLess'
      : more
        ? 'comparison.insights.totalMoreHousehold'
        : 'comparison.insights.totalLessHousehold'
  return t(key, { percent: getPercentMagnitude(totalPercentChange) })
}

/** The single-person (Mine) view's insights: unchanged from before ADR-011's household view. */
export function buildInsights(t: TFunction, comparison: PeriodComparison): string[] {
  const categoryInsights = buildCategoryInsights(t, comparison.categories, 'own')
  const totalInsight = buildTotalInsight(t, comparison.totalPercentChange, 'own')

  return [...categoryInsights, ...(totalInsight ? [totalInsight] : [])]
}

/**
 * The household view's single combined total insight ("Overall, the
 * household spent X% more…") - phrased impersonally so it never has to pick
 * a grammatical person for two people, unlike the per-member category
 * insights. See docs/adr/011-household-combined-analytics.md.
 */
export function buildHouseholdTotalInsight(t: TFunction, totalPercentChange: number | null): string | null {
  return buildTotalInsight(t, totalPercentChange, 'household')
}
