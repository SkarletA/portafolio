import { render, screen, within, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '@hooks/useAnalytics'
import { useCurrency } from '@context/CurrencyContext'
import { useHousehold } from '@context/HouseholdContext'
import { useLanguage } from '@context/LanguageContext'
import type { MonthlyStats, CategorySpending, TrendPoint, PeriodComparison } from '@services/analyticsService'
import { Analytics } from './Analytics'

vi.mock('@hooks/useAnalytics', () => ({ useAnalytics: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: vi.fn() }))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }
const partnerProfile = { user_id: 'u2', first_name: 'Dana', last_name: null, avatar_url: null }

const STATS: MonthlyStats = {
  totalSpent: 1250,
  totalCoveredBySavings: 0,
  totalDepositedToGoals: 300,
  totalIncome: 3200,
  avgPerDay: 41.67,
  savingsRate: 60.94,
}

const SPENDING_BY_CATEGORY: CategorySpending[] = [
  { category_id: 'c1', name: 'Food', icon: null, color: '#f59e0b', translationKey: null, amount: 500, percentage: 40 },
  { category_id: 'c2', name: 'Transport', icon: null, color: '#3b82f6', translationKey: null, amount: 300, percentage: 24 },
]

const TREND_DATA: TrendPoint[] = [
  { date: '2026-09-01', amount: 100 },
  { date: '2026-09-02', amount: 200 },
]

const COMPARISON_NO_PREVIOUS: PeriodComparison = {
  currentTotal: 1250,
  previousTotal: 0,
  totalPercentChange: null,
  categories: [],
  hasPreviousData: false,
}

const COMPARISON_WITH_PREVIOUS: PeriodComparison = {
  currentTotal: 1250,
  previousTotal: 1000,
  totalPercentChange: 25,
  categories: [
    { category_id: 'c1', name: 'Food', icon: null, color: '#f59e0b', translationKey: null, currentAmount: 500, previousAmount: 400, percentChange: 25 },
  ],
  hasPreviousData: true,
}

function mockAnalytics(overrides: Partial<ReturnType<typeof useAnalytics>> = {}) {
  vi.mocked(useAnalytics).mockReturnValue({
    stats: STATS,
    spendingByCategory: SPENDING_BY_CATEGORY,
    trendData: TREND_DATA,
    comparison: COMPARISON_NO_PREVIOUS,
    householdBreakdown: null,
    householdTrend: [],
    householdComparison: null,
    isHouseholdView: false,
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  })
}

function renderPage() {
  return render(<Analytics />)
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.mocked(useCurrency).mockReturnValue({ currency: 'USD', setCurrency: vi.fn() })
    vi.mocked(useLanguage).mockReturnValue({ language: 'en', setLanguage: vi.fn() })
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null, partner: null } as never)
    mockAnalytics()
  })

  it('shows a loading state while analytics are loading', () => {
    mockAnalytics({ stats: null, loading: true })
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', () => {
    mockAnalytics({ stats: null, loading: false, error: 'boom' })
    renderPage()
    expect(screen.getByText('state.error')).toBeInTheDocument()
  })

  it('shows an empty message when the period has no data at all', () => {
    mockAnalytics({
      stats: { totalSpent: 0, totalCoveredBySavings: 0, totalDepositedToGoals: 0, totalIncome: 0, avgPerDay: 0, savingsRate: 0 },
    })
    renderPage()
    expect(screen.getByText('state.empty')).toBeInTheDocument()
  })

  it('renders the period stats', () => {
    renderPage()
    expect(within(screen.getByTestId('analytics-total-spent-stat')).getByText('$1,250.00')).toBeInTheDocument()
    expect(within(screen.getByTestId('analytics-avg-per-day-stat')).getByText('$41.67')).toBeInTheDocument()
    expect(within(screen.getByTestId('analytics-savings-rate-stat')).getByText('61%')).toBeInTheDocument()
    expect(within(screen.getByTestId('analytics-saved-to-goals-stat')).getByText('$300.00')).toBeInTheDocument()
  })

  it('only shows the covered-by-savings note when there is something covered', () => {
    renderPage()
    expect(screen.queryByTestId('analytics-covered-by-savings-note')).not.toBeInTheDocument()

    mockAnalytics({ stats: { ...STATS, totalCoveredBySavings: 150 } })
    renderPage()
    expect(screen.getByTestId('analytics-covered-by-savings-note')).toBeInTheDocument()
  })

  it('switches period when a period button is clicked', () => {
    renderPage()
    const yearButton = screen.getByTestId('analytics-period-year-button')

    expect(useAnalytics).toHaveBeenLastCalledWith('month', 'mine')
    fireEvent.click(yearButton)

    expect(useAnalytics).toHaveBeenLastCalledWith('year', 'mine')
    expect(yearButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not show the Mine/Household toggle without an accepted household partner', () => {
    renderPage()
    expect(screen.queryByTestId('analytics-tab-household-button')).not.toBeInTheDocument()
  })

  it('shows the toggle and switches viewMode when a household is accepted (ADR-011)', () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner, partner: partnerProfile } as never)
    renderPage()

    expect(useAnalytics).toHaveBeenLastCalledWith('month', 'mine')
    const householdButton = screen.getByTestId('analytics-tab-household-button')
    fireEvent.click(householdButton)

    expect(useAnalytics).toHaveBeenLastCalledWith('month', 'household')
    expect(householdButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a no-previous-data message when there is nothing to compare against', () => {
    renderPage()
    expect(screen.getByText('comparison.noPreviousData')).toBeInTheDocument()
  })

  it('renders the comparison categories when previous-period data exists', () => {
    mockAnalytics({ comparison: COMPARISON_WITH_PREVIOUS })
    renderPage()
    expect(screen.queryByText('comparison.noPreviousData')).not.toBeInTheDocument()
    expect(screen.getByText('$400.00 → $500.00')).toBeInTheDocument()
  })

  describe('household view', () => {
    const HOUSEHOLD_BREAKDOWN = {
      own: [{ category_id: 'c1', name: 'Food', icon: null, color: '#f59e0b', translationKey: null, amount: 400, percentage: 50 }],
      partner: [{ category_id: 'c1', name: 'Food', icon: null, color: '#f59e0b', translationKey: null, amount: 600, percentage: 50 }],
    }

    beforeEach(() => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner, partner: partnerProfile } as never)
    })

    it('never blind-merges the category breakdown - shows two labeled columns instead (ADR-011)', () => {
      mockAnalytics({ isHouseholdView: true, householdBreakdown: HOUSEHOLD_BREAKDOWN })
      renderPage()

      expect(within(screen.getByTestId('analytics-breakdown-own-column')).getByText('$400.00')).toBeInTheDocument()
      expect(within(screen.getByTestId('analytics-breakdown-partner-column')).getByText('$600.00')).toBeInTheDocument()
      expect(within(screen.getByTestId('analytics-breakdown-partner-column')).getByText('Dana')).toBeInTheDocument()
    })

    it('renders each column independently empty when only one member has spending', () => {
      mockAnalytics({
        isHouseholdView: true,
        householdBreakdown: { own: HOUSEHOLD_BREAKDOWN.own, partner: [] },
      })
      renderPage()

      expect(within(screen.getByTestId('analytics-breakdown-partner-column')).getByText('categoryBreakdown.empty')).toBeInTheDocument()
      expect(within(screen.getByTestId('analytics-breakdown-own-column')).getByText('$400.00')).toBeInTheDocument()
    })

    it('splits the comparison table into per-member columns, keeping the headline total combined', () => {
      mockAnalytics({
        isHouseholdView: true,
        householdComparison: {
          currentTotal: 1000,
          previousTotal: 800,
          totalPercentChange: 25,
          hasPreviousData: true,
          own: [
            { category_id: 'c1', name: 'Food', icon: null, color: null, translationKey: null, currentAmount: 400, previousAmount: 300, percentChange: 33.33 },
          ],
          partner: [
            { category_id: 'c2', name: 'Rent', icon: null, color: null, translationKey: null, currentAmount: 600, previousAmount: 500, percentChange: 20 },
          ],
        },
      })
      renderPage()

      expect(within(screen.getByTestId('analytics-comparison-own-column')).getByText('$300.00 → $400.00')).toBeInTheDocument()
      expect(within(screen.getByTestId('analytics-comparison-partner-column')).getByText('$500.00 → $600.00')).toBeInTheDocument()
    })

    it('generates insights per member plus one combined household total insight', () => {
      mockAnalytics({
        isHouseholdView: true,
        householdComparison: {
          currentTotal: 1000,
          previousTotal: 800,
          totalPercentChange: 25,
          hasPreviousData: true,
          own: [
            { category_id: 'c1', name: 'Food', icon: null, color: null, translationKey: null, currentAmount: 400, previousAmount: 300, percentChange: 33 },
          ],
          partner: [
            { category_id: 'c2', name: 'Rent', icon: null, color: null, translationKey: null, currentAmount: 600, previousAmount: 750, percentChange: -20 },
          ],
        },
      })
      renderPage()

      // The global react-i18next mock returns "key:JSON(options)" instead of
      // real copy, so these assert the right key/variant was picked for each
      // subject (own vs. the partner vs. the combined household total) -
      // analyticsInsights.test.ts covers the real EN/ES wording.
      expect(
        screen.getByText('comparison.insights.categoryMore:{"percent":33,"category":"Food"}')
      ).toBeInTheDocument()
      expect(
        screen.getByText('comparison.insights.categoryLessOther:{"percent":20,"category":"Rent","name":"Dana"}')
      ).toBeInTheDocument()
      expect(screen.getByText('comparison.insights.totalMoreHousehold:{"percent":25}')).toBeInTheDocument()
    })
  })
})
