import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNavigate } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { useAuth } from '@context/AuthContext'
import { useProfile } from '@hooks/useProfile'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { useTransactions } from '@hooks/useTransactions'
import { useBudgets } from '@hooks/useBudgets'
import { useDashboardSummary } from '@hooks/useDashboardSummary'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn() }
})
vi.mock('../../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../../hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('../../context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('../../context/LanguageContext', () => ({ useLanguage: vi.fn() }))
vi.mock('../../hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
vi.mock('../../hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('../../hooks/useDashboardSummary', () => ({ useDashboardSummary: vi.fn() }))
// Not under test here - TransactionItem/BudgetCard have their own tests. Stand
// in for them so Dashboard's own data-slicing/section logic is what's exercised.
vi.mock('../../components/molecules/TransactionItem/TransactionItem', () => ({
  TransactionItem: ({ transaction }: { transaction: { id: string; description: string } }) => (
    <li data-testid={`mock-transaction-${transaction.id}`}>{transaction.description}</li>
  ),
}))
vi.mock('../../components/molecules/BudgetCard/BudgetCard', () => ({
  BudgetCard: ({ budget }: { budget: { id: string } }) => <li data-testid={`mock-budget-${budget.id}`} />,
}))

const EMPTY_TRANSACTIONS = { transactions: [], loading: false, error: null, refetch: vi.fn() }
const EMPTY_BUDGETS = { budgets: [], loading: false, error: null }
const EMPTY_SUMMARY = { stats: null, spendingByCategory: [], loading: false, error: null }

function mockAllHooks() {
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'ada@example.com' } } as never)
  vi.mocked(useProfile).mockReturnValue({ profile: null, loading: false, error: null, refetch: vi.fn() } as never)
  vi.mocked(useCurrency).mockReturnValue({ currency: 'USD', setCurrency: vi.fn() } as never)
  vi.mocked(useLanguage).mockReturnValue({ language: 'en', setLanguage: vi.fn() } as never)
  vi.mocked(useTransactions).mockReturnValue(EMPTY_TRANSACTIONS as never)
  vi.mocked(useBudgets).mockReturnValue(EMPTY_BUDGETS as never)
  vi.mocked(useDashboardSummary).mockReturnValue(EMPTY_SUMMARY as never)
}

function renderPage() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    mockAllHooks()
  })

  it('renders the header title and subtitle', () => {
    renderPage()

    expect(screen.getByText('dashboard:title')).toBeInTheDocument()
    expect(screen.getByText('dashboard:subtitle')).toBeInTheDocument()
  })

  it('shows a loading status while the overview is loading', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({ ...EMPTY_SUMMARY, loading: true } as never)

    renderPage()

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
  })

  it('shows the overview error message when useDashboardSummary errors', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({ ...EMPTY_SUMMARY, error: 'boom' } as never)

    renderPage()

    expect(screen.getByText('dashboard:overview.error')).toBeInTheDocument()
  })

  it('shows the empty message when there are no recent transactions', () => {
    renderPage()

    expect(screen.getByText('dashboard:recentTransactions.empty')).toBeInTheDocument()
  })

  it('renders recent transactions, capped at 5, most-recent-first order from the hook', () => {
    const transactions = Array.from({ length: 7 }, (_, i) => ({ id: `t${i}`, description: `Tx ${i}` }))
    vi.mocked(useTransactions).mockReturnValue({ ...EMPTY_TRANSACTIONS, transactions } as never)

    renderPage()

    expect(screen.getByTestId('mock-transaction-t0')).toBeInTheDocument()
    expect(screen.getByTestId('mock-transaction-t4')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-transaction-t5')).not.toBeInTheDocument()
  })

  it('renders the budgets preview, capped at 3', () => {
    const budgets = Array.from({ length: 5 }, (_, i) => ({ id: `b${i}` }))
    vi.mocked(useBudgets).mockReturnValue({ ...EMPTY_BUDGETS, budgets } as never)

    renderPage()

    expect(screen.getByTestId('mock-budget-b0')).toBeInTheDocument()
    expect(screen.getByTestId('mock-budget-b2')).toBeInTheDocument()
    expect(screen.queryByTestId('mock-budget-b3')).not.toBeInTheDocument()
  })

  it('shows the balance and stat cards once there is overview data', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      stats: {
        totalSpent: 400,
        totalCoveredBySavings: 0,
        totalDepositedToGoals: 0,
        totalIncome: 1000,
        avgPerDay: 10,
        savingsRate: 60,
      },
      spendingByCategory: [],
      loading: false,
      error: null,
    } as never)

    renderPage()

    expect(screen.getByTestId('dashboard-income-stat')).toHaveTextContent('$1,000.00')
    expect(screen.getByTestId('dashboard-expenses-stat')).toHaveTextContent('$400.00')
    // balance = income - spent - depositedToGoals = 1000 - 400 - 0
    expect(screen.getByText('$600.00')).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-moved-to-goals-note')).not.toBeInTheDocument()
  })

  it('shows the moved-to-goals note when part of the balance went to a goal', () => {
    vi.mocked(useDashboardSummary).mockReturnValue({
      stats: {
        totalSpent: 0,
        totalCoveredBySavings: 0,
        totalDepositedToGoals: 100,
        totalIncome: 500,
        avgPerDay: 5,
        savingsRate: 80,
      },
      spendingByCategory: [],
      loading: false,
      error: null,
    } as never)

    renderPage()

    expect(screen.getByTestId('dashboard-moved-to-goals-note')).toBeInTheDocument()
  })

  it('navigates to add-transaction when the header button is clicked', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    renderPage()
    fireEvent.click(screen.getByTestId('dashboard-add-transaction-button'))

    expect(navigate).toHaveBeenCalledWith('/finora/add-transaction')
  })
})
