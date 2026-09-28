import { render, screen, within, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from '@hooks/useAnalytics'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import type { MonthlyStats, CategorySpending, TrendPoint, PeriodComparison } from '@services/analyticsService'
import { Analytics } from './Analytics'

vi.mock('@hooks/useAnalytics', () => ({ useAnalytics: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: vi.fn() }))

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

    expect(useAnalytics).toHaveBeenLastCalledWith('month')
    fireEvent.click(yearButton)

    expect(useAnalytics).toHaveBeenLastCalledWith('year')
    expect(yearButton).toHaveAttribute('aria-pressed', 'true')
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
})
