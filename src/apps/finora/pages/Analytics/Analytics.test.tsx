import { render, screen, within, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '@hooks/useAnalytics'
import { useCurrency } from '@context/CurrencyContext'
import { useHousehold } from '@context/HouseholdContext'
import { useLanguage } from '@context/LanguageContext'
import type { MonthlyStats, CategorySpending, TrendPoint, PeriodComparison } from '@services/analyticsService'
import type { Category } from '@domain/category'
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
    categories: [],
    rawByCategory: {},
    householdBreakdown: null,
    householdRaw: null,
    householdTrend: [],
    householdComparison: null,
    isHouseholdView: false,
    loading: false,
    error: null,
    selectedBucket: null,
    selectBucket: vi.fn(),
    bucketSpendingByCategory: [],
    bucketRawByCategory: {},
    householdBucketBreakdown: null,
    bucketLoading: false,
    bucketError: null,
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

  describe('subcategory breakdown (Spending by category only)', () => {
    const housing: Category = { id: 'housing', name: 'Housing', icon: null, color: null, parent_id: null, translationKey: null }
    const rent: Category = { id: 'rent', name: 'Rent', icon: null, color: null, parent_id: 'housing', translationKey: null }
    const services: Category = { id: 'services', name: 'Services', icon: null, color: null, parent_id: 'housing', translationKey: null }
    const housingSpending: CategorySpending = {
      category_id: 'housing',
      name: 'Housing',
      icon: null,
      color: null,
      translationKey: null,
      amount: 1200,
      percentage: 60,
    }

    it('expands a category with subcategories into a breakdown, in the Mine view', () => {
      mockAnalytics({
        spendingByCategory: [housingSpending],
        categories: [housing, rent, services],
        rawByCategory: { rent: 900, services: 300 },
      })
      renderPage()

      fireEvent.click(screen.getByTestId('budget-card-housing-expand-toggle'))

      expect(screen.getByText('Rent')).toBeInTheDocument()
      expect(screen.getByText('Services')).toBeInTheDocument()
    })

    it('does not expand "Top spending categories" - that list stays a plain glance-able list', () => {
      mockAnalytics({
        spendingByCategory: [housingSpending],
        categories: [housing, rent, services],
        rawByCategory: { rent: 900, services: 300 },
      })
      renderPage()

      expect(screen.queryAllByTestId('budget-card-housing-expand-toggle')).toHaveLength(1)
    })

    it('expands each member\'s own breakdown independently in the Household view', () => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner, partner: partnerProfile } as never)
      mockAnalytics({
        isHouseholdView: true,
        householdBreakdown: { own: [housingSpending], partner: [{ ...housingSpending, amount: 600 }] },
        householdRaw: { own: { rent: 900, services: 300 }, partner: { rent: 600 } },
        categories: [housing, rent, services],
      })
      renderPage()

      const ownColumn = screen.getByTestId('analytics-breakdown-own-column')
      const partnerColumn = screen.getByTestId('analytics-breakdown-partner-column')

      fireEvent.click(within(ownColumn).getByTestId('budget-card-housing-expand-toggle'))
      expect(within(ownColumn).getByText('Services')).toBeInTheDocument()
      // The partner's own breakdown panel is still collapsed - expanding one
      // member's column must not reveal the other's.
      expect(within(partnerColumn).queryByText('Services')).not.toBeInTheDocument()
    })
  })

  describe('selected bucket (click-to-drill into Spending by category)', () => {
    it('shows the plain title and no Clear button when no bucket is selected', () => {
      renderPage()

      expect(screen.getByText('categoryBreakdown.title')).toBeInTheDocument()
      expect(screen.queryByTestId('analytics-clear-bucket-button')).not.toBeInTheDocument()
    })

    it('shows the period in the title and a Clear button once a bucket is selected', () => {
      mockAnalytics({ selectedBucket: '2026-09-01' })
      renderPage()

      expect(
        screen.getByText('categoryBreakdown.titleWithPeriod:{"period":"September 2026"}')
      ).toBeInTheDocument()
      expect(screen.getByTestId('analytics-clear-bucket-button')).toBeInTheDocument()
    })

    it('clears the selection when the Clear button is clicked', () => {
      const selectBucket = vi.fn()
      mockAnalytics({ selectedBucket: '2026-09-01', selectBucket })
      renderPage()

      fireEvent.click(screen.getByTestId('analytics-clear-bucket-button'))

      expect(selectBucket).toHaveBeenCalledWith(null)
    })

    it('shows the loading message instead of stale data while the bucket is loading', () => {
      mockAnalytics({ selectedBucket: '2026-09-01', bucketLoading: true })
      renderPage()

      const card = screen.getByTestId('analytics-category-breakdown-card')
      expect(within(card).getByText('categoryBreakdown.loadingBucket')).toBeInTheDocument()
      // "Food" still legitimately appears in Top spending categories, which
      // keeps showing the period's data - only this card swaps to the bucket.
      expect(within(card).queryByText('Food')).not.toBeInTheDocument()
    })

    it('shows the clicked bucket\'s own categories instead of the period\'s, in the Mine view', () => {
      mockAnalytics({
        selectedBucket: '2026-09-01',
        spendingByCategory: SPENDING_BY_CATEGORY,
        bucketSpendingByCategory: [
          { category_id: 'c3', name: 'Health', icon: null, color: '#10b981', translationKey: null, amount: 80, percentage: 100 },
        ],
      })
      renderPage()

      const card = screen.getByTestId('analytics-category-breakdown-card')
      expect(within(card).getByText('Health')).toBeInTheDocument()
      expect(within(card).queryByText('Food')).not.toBeInTheDocument()
    })

    it("shows the clicked bucket's own per-member columns instead of the period's, in the Household view", () => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner, partner: partnerProfile } as never)
      mockAnalytics({
        isHouseholdView: true,
        selectedBucket: '2026-09-01',
        householdBreakdown: {
          own: [{ category_id: 'c1', name: 'Food', icon: null, color: null, translationKey: null, amount: 400, percentage: 100 }],
          partner: [],
        },
        householdBucketBreakdown: {
          own: [{ category_id: 'c4', name: 'Rent', icon: null, color: null, translationKey: null, amount: 5200, percentage: 100 }],
          partner: [{ category_id: 'c4', name: 'Rent', icon: null, color: null, translationKey: null, amount: 9500, percentage: 100 }],
          ownRaw: {},
          partnerRaw: {},
        },
      })
      renderPage()

      const ownColumn = screen.getByTestId('analytics-breakdown-own-column')
      expect(within(ownColumn).getByText('$5,200.00')).toBeInTheDocument()
      expect(within(ownColumn).queryByText('$400.00')).not.toBeInTheDocument()
    })
  })
})
