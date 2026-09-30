import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactions } from '@hooks/useTransactions'
import { useCategories } from '@hooks/useCategories'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import type { TransactionWithCategory } from '@services/transactionsService'
import { Transactions } from './Transactions'

vi.mock('@hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
vi.mock('@hooks/useCategories', () => ({ useCategories: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: vi.fn() }))
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@example.com' } }) }))
vi.mock('@context/HouseholdContext', () => ({
  useHousehold: () => ({ ownMember: null, partnerMember: null, partner: null }),
}))

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const CATEGORY_FOOD = { id: 'c1', name: 'Food', icon: null, color: null, parent_id: null, translationKey: null }
const CATEGORY_TRANSPORT = { id: 'c2', name: 'Transport', icon: null, color: null, parent_id: null, translationKey: null }

function transaction(overrides: Partial<TransactionWithCategory>): TransactionWithCategory {
  return {
    id: '1',
    user_id: 'u1',
    description: 'Starbucks',
    amount: 120,
    type: 'expense',
    category_id: 'c1',
    date: '2026-09-08',
    notes: null,
    created_at: null,
    installment_months: 1,
    funding_source: 'income',
    refunds_transaction_id: null,
    last_installment_date: '2026-09-08',
    goal_transfer: null,
    category: { id: 'c1', name: 'Food', icon: null, color: null, translationKey: null },
    payments: [{ id: 'p1', transaction_id: '1', payment_method: 'Credit Card', amount: 120 }],
    is_shared: false,
    shares: [],
    ...overrides,
  }
}

const TRANSACTIONS: TransactionWithCategory[] = [
  transaction({ id: 't1', description: 'Starbucks', category_id: 'c1', category: CATEGORY_FOOD, payments: [{ id: 'p1', transaction_id: 't1', payment_method: 'Credit Card', amount: 120 }] }),
  transaction({ id: 't2', description: 'Uber ride', category_id: 'c2', category: CATEGORY_TRANSPORT, payments: [{ id: 'p2', transaction_id: 't2', payment_method: 'Cash', amount: 40 }] }),
]

function mockDefaults() {
  vi.mocked(useTransactions).mockReturnValue({ transactions: TRANSACTIONS, loading: false, error: null, refetch: vi.fn() })
  vi.mocked(useCategories).mockReturnValue({ categories: [CATEGORY_FOOD, CATEGORY_TRANSPORT], loading: false, error: null, refetch: vi.fn() })
  vi.mocked(useCurrency).mockReturnValue({ currency: 'USD', setCurrency: vi.fn() })
  vi.mocked(useLanguage).mockReturnValue({ language: 'en', setLanguage: vi.fn() })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Transactions />
    </MemoryRouter>
  )
}

describe('Transactions', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    mockDefaults()
  })

  it('shows a loading state while transactions are loading', () => {
    vi.mocked(useTransactions).mockReturnValue({ transactions: [], loading: true, error: null, refetch: vi.fn() })
    renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows an error message when the fetch fails', () => {
    vi.mocked(useTransactions).mockReturnValue({ transactions: [], loading: false, error: 'boom', refetch: vi.fn() })
    renderPage()
    expect(screen.getByText('transactions:list.error')).toBeInTheDocument()
  })

  it('shows an empty message when there are no transactions at all', () => {
    vi.mocked(useTransactions).mockReturnValue({ transactions: [], loading: false, error: null, refetch: vi.fn() })
    renderPage()
    expect(screen.getByText('transactions:list.empty')).toBeInTheDocument()
  })

  it('renders every transaction', () => {
    renderPage()
    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getByText('Uber ride')).toBeInTheDocument()
  })

  it('filters by description via the search input', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('transactions-search-input'), { target: { value: 'uber' } })
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
    expect(screen.getByText('Uber ride')).toBeInTheDocument()
  })

  it('filters by category', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('transactions-category-select-trigger'))
    fireEvent.click(screen.getByTestId('transactions-category-select-option-c2'))
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
    expect(screen.getByText('Uber ride')).toBeInTheDocument()
  })

  it('filters by payment method', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('transactions-payment-method-select-trigger'))
    fireEvent.click(screen.getByTestId('transactions-payment-method-select-option-Cash'))
    expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
    expect(screen.getByText('Uber ride')).toBeInTheDocument()
  })

  it('shows a no-matches message when a filter excludes every transaction', () => {
    renderPage()
    fireEvent.change(screen.getByTestId('transactions-search-input'), { target: { value: 'nothing matches this' } })
    expect(screen.getByText('transactions:list.noMatches')).toBeInTheDocument()
  })

  it('navigates to add-transaction when the add button is clicked', () => {
    renderPage()
    fireEvent.click(screen.getByTestId('transactions-add-button'))
    expect(navigateMock).toHaveBeenCalledWith('/finora/add-transaction')
  })
})
