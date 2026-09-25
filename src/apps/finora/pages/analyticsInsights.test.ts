import i18next, { type TFunction } from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import { getPercentChange } from '@domain/analytics'
import type { PeriodComparison, PeriodComparisonCategory } from '@services/analyticsService'
import enAnalytics from '../locales/en/analytics.json'
import esAnalytics from '../locales/es/analytics.json'
import { buildInsights } from './analyticsInsights'

// A real i18next instance with the real locale files (not the global
// react-i18next mock), so the assertions cover the template and the
// interpolated value together - that's where a doubled "%" would appear.
const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    defaultNS: 'analytics',
    resources: { en: { analytics: enAnalytics }, es: { analytics: esAnalytics } },
    interpolation: { escapeValue: false },
  })
})

function category(name: string, percentChange: number | null): PeriodComparisonCategory {
  return {
    category_id: name,
    name,
    icon: null,
    color: null,
    translationKey: null,
    currentAmount: 0,
    previousAmount: 0,
    percentChange,
  }
}

const comparison: PeriodComparison = {
  currentTotal: 5500,
  previousTotal: 1000,
  totalPercentChange: 450,
  categories: [category('Food', -27.6), category('Transport', 10), category('Rent', null)],
  hasPreviousData: true,
}

describe('buildInsights', () => {
  it('renders each percentage with a single "%" in English', () => {
    const insights = buildInsights(i18n.getFixedT('en') as TFunction, comparison)

    expect(insights).toEqual([
      'You spent 28% less on Food than the previous period.',
      'You spent 10% more on Transport than the previous period.',
      'Overall, you spent 450% more than the previous period.',
    ])
  })

  it('renders each percentage with a single "%" in Spanish', () => {
    const insights = buildInsights(i18n.getFixedT('es') as TFunction, comparison)

    expect(insights).toEqual([
      'Gastaste 28% menos en Food que en el periodo anterior.',
      'Gastaste 10% más en Transport que en el periodo anterior.',
      'En general, gastaste 450% más que en el periodo anterior.',
    ])
  })

  it('says spending stayed the same when two periods total the same despite float noise', () => {
    const sameTotal: PeriodComparison = {
      currentTotal: 0.1 + 0.2,
      previousTotal: 0.3,
      totalPercentChange: getPercentChange(0.1 + 0.2, 0.3),
      categories: [category('Food', getPercentChange(0.1 + 0.2, 0.3))],
      hasPreviousData: true,
    }

    expect(buildInsights(i18n.getFixedT('en') as TFunction, sameTotal)).toEqual([
      'Your spending on Food stayed the same as the previous period.',
      'Your total spending stayed the same as the previous period.',
    ])
  })
})
