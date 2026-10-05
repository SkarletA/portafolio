import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactions } from '@hooks/useTransactions'
import { useCategories } from '@hooks/useCategories'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { useHousehold } from '@context/HouseholdContext'
import type { TransactionWithCategory } from '@services/transactionsService'
import { Transactions } from './Transactions'

vi.mock('@hooks/useTransactions', () => ({ useTransactions: vi.fn() }))
vi.mock('@hooks/useCategories', () => ({ useCategories: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: vi.fn() }))
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@example.com' } }) }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }

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
    is_household_expense: false,
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
  // No household by default: most of these tests predate PR5's owner tab, so
  // it stays hidden, same as for every user without a household today.
  vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null, partner: null } as never)
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

  describe('month filter', () => {
    const augustRent = transaction({
      id: 't7',
      description: 'August rent',
      date: '2026-08-01',
      category_id: 'c2',
      category: CATEGORY_TRANSPORT,
      payments: [{ id: 'p7', transaction_id: 't7', payment_method: 'Cash', amount: 500 }],
    })

    it('shows only the selected month\'s transactions', () => {
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, augustRent],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-month-select-option-2026-08'))

      expect(screen.getByText('August rent')).toBeInTheDocument()
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument()
    })

    it('offers only months that actually have a transaction', () => {
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, augustRent],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      expect(screen.getByTestId('transactions-month-select-option-2026-08')).toBeInTheDocument()
      expect(screen.getByTestId('transactions-month-select-option-2026-09')).toBeInTheDocument()
      expect(screen.queryByTestId('transactions-month-select-option-2026-07')).not.toBeInTheDocument()
    })

    it('combines the month filter with category (AND, not OR)', () => {
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, augustRent],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-month-select-option-2026-09'))
      fireEvent.click(screen.getByTestId('transactions-category-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-category-select-option-c2'))

      // September has Uber ride (Transport) but not August rent (also
      // Transport, wrong month) - the two filters narrow together, neither
      // one on its own.
      expect(screen.getByText('Uber ride')).toBeInTheDocument()
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
      expect(screen.queryByText('August rent')).not.toBeInTheDocument()
    })

    it('shows the no-matches empty state when the month and another filter leave nothing', () => {
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, augustRent],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-month-select-option-2026-08'))
      fireEvent.click(screen.getByTestId('transactions-category-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-category-select-option-c1'))

      // August only has the Transport rent - nothing Food (c1) that month.
      expect(screen.getByText('transactions:list.noMatches')).toBeInTheDocument()
    })

    it('shows a clear button only while a month is selected, and resets the list when clicked', () => {
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, augustRent],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      expect(screen.queryByTestId('transactions-clear-month-button')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-month-select-option-2026-08'))
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTestId('transactions-clear-month-button'))

      expect(screen.queryByTestId('transactions-clear-month-button')).not.toBeInTheDocument()
      expect(screen.getByText('Starbucks')).toBeInTheDocument()
      expect(screen.getByText('August rent')).toBeInTheDocument()
    })

    it('applies the same month filter on the household tab', () => {
      const householdAugust = transaction({
        id: 't8',
        user_id: 'u2',
        description: 'August shared gas',
        date: '2026-08-15',
        is_shared: true,
        shares: [
          { id: 's5', transaction_id: 't8', user_id: 'u1', amount: 20 },
          { id: 's6', transaction_id: 't8', user_id: 'u2', amount: 20 },
        ],
      })
      const householdSeptember = transaction({
        id: 't9',
        user_id: 'u2',
        description: 'September shared gas',
        is_shared: true,
        shares: [
          { id: 's7', transaction_id: 't9', user_id: 'u1', amount: 20 },
          { id: 's8', transaction_id: 't9', user_id: 'u2', amount: 20 },
        ],
      })
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(useTransactions).mockReturnValue({
        transactions: [...TRANSACTIONS, householdAugust, householdSeptember],
        loading: false,
        error: null,
        refetch: vi.fn(),
      })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-tab-household-button'))
      fireEvent.click(screen.getByTestId('transactions-month-select-trigger'))
      fireEvent.click(screen.getByTestId('transactions-month-select-option-2026-08'))

      expect(screen.getByText('August shared gas')).toBeInTheDocument()
      expect(screen.queryByText('September shared gas')).not.toBeInTheDocument()
    })
  })

  describe('owner tabs', () => {
    // A shared expense the signed-in user registered themselves - the exact
    // bug this filter fix covers: it must show on BOTH tabs, not get hidden
    // from Household just because its user_id is the caller's own.
    const sharedByMe = transaction({
      id: 't3',
      description: 'Rent',
      is_shared: true,
      shares: [
        { id: 's1', transaction_id: 't3', user_id: 'u1', amount: 30 },
        { id: 's2', transaction_id: 't3', user_id: 'u2', amount: 30 },
      ],
    })
    // The partner's personal (non-shared) expense - visible to the household
    // via RLS, but must NOT appear on the Household tab (that tab is "shared
    // expenses", not "the partner's rows" - see Transactions.tsx).
    const partnerPersonal = transaction({
      id: 't4',
      user_id: 'u2',
      description: 'Groceries',
      category_id: 'c1',
      category: CATEGORY_FOOD,
      payments: [{ id: 'p4', transaction_id: 't4', payment_method: 'Cash', amount: 60 }],
    })
    const partnerShared = transaction({
      id: 't5',
      user_id: 'u2',
      description: 'Gas',
      is_shared: true,
      shares: [
        { id: 's3', transaction_id: 't5', user_id: 'u1', amount: 20 },
        { id: 's4', transaction_id: 't5', user_id: 'u2', amount: 20 },
      ],
    })
    // Case B (ADR-010): no split, just tagged - must also show on the
    // household tab, same as a Case A split.
    const myHouseholdTagged = transaction({
      id: 't6',
      description: 'Medicine',
      is_household_expense: true,
    })
    const householdTransactions: TransactionWithCategory[] = [
      ...TRANSACTIONS,
      sharedByMe,
      partnerPersonal,
      partnerShared,
      myHouseholdTagged,
    ]

    it('shows no tab toggle without an active household', () => {
      renderPage()
      expect(screen.queryByTestId('transactions-tab-mine-button')).not.toBeInTheDocument()
    })

    it('shows no tab toggle while the partner has only a pending invitation', () => {
      vi.mocked(useHousehold).mockReturnValue({
        ownMember: acceptedOwn,
        partnerMember: { ...acceptedPartner, status: 'pending' },
      } as never)
      renderPage()
      expect(screen.queryByTestId('transactions-tab-mine-button')).not.toBeInTheDocument()
    })

    it('defaults to "my transactions": everything of mine, shared or not, never the partner\'s', () => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(useTransactions).mockReturnValue({ transactions: householdTransactions, loading: false, error: null, refetch: vi.fn() })
      renderPage()

      expect(screen.getByTestId('transactions-tab-mine-button')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Starbucks')).toBeInTheDocument()
      expect(screen.getByText('Rent')).toBeInTheDocument()
      expect(screen.getByText('Medicine')).toBeInTheDocument()
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
      expect(screen.queryByText('Gas')).not.toBeInTheDocument()
    })

    it('shows every household-tagged expense on the household tab (split or not), regardless of who registered it', () => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(useTransactions).mockReturnValue({ transactions: householdTransactions, loading: false, error: null, refetch: vi.fn() })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-tab-household-button'))

      // The bug: a shared expense the caller registered themselves must
      // still show here, not just the partner's.
      expect(screen.getByText('Rent')).toBeInTheDocument()
      expect(screen.getByText('Gas')).toBeInTheDocument()
      // Case B (ADR-010): no split, just tagged - also shows here.
      expect(screen.getByText('Medicine')).toBeInTheDocument()
      // Not the partner's unrelated personal expense, and not the caller's
      // own non-tagged ones.
      expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument()
    })

    it('shows a household-specific empty message when there are no shared expenses', () => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(useTransactions).mockReturnValue({ transactions: TRANSACTIONS, loading: false, error: null, refetch: vi.fn() })
      renderPage()

      fireEvent.click(screen.getByTestId('transactions-tab-household-button'))

      expect(screen.getByText('transactions:list.emptyHousehold')).toBeInTheDocument()
    })
  })

  describe('category and payment method filters', () => {
    const CATEGORY_COMIDA = { id: 'c3', name: 'Comida', icon: null, color: null, parent_id: 'c1', translationKey: null }
    const HIERARCHY_TRANSACTIONS: TransactionWithCategory[] = [
      transaction({ id: 't1', description: 'Starbucks', category_id: 'c1', category: CATEGORY_FOOD, payments: [{ id: 'p1', transaction_id: 't1', payment_method: 'Credit Card', amount: 120 }] }),
      transaction({ id: 't3', description: 'Almuerzo', category_id: 'c3', category: CATEGORY_COMIDA, payments: [{ id: 'p3', transaction_id: 't3', payment_method: 'Cash', amount: 25 }] }),
      transaction({ id: 't2', description: 'Uber ride', category_id: 'c2', category: CATEGORY_TRANSPORT, payments: [{ id: 'p2', transaction_id: 't2', payment_method: 'Cash', amount: 40 }] }),
    ]

    beforeEach(() => {
      vi.mocked(useTransactions).mockReturnValue({ transactions: HIERARCHY_TRANSACTIONS, loading: false, error: null, refetch: vi.fn() })
      vi.mocked(useCategories).mockReturnValue({ categories: [CATEGORY_FOOD, CATEGORY_COMIDA, CATEGORY_TRANSPORT], loading: false, error: null, refetch: vi.fn() })
    })

    function pickCategory(categoryValue: string) {
      fireEvent.click(screen.getByTestId('transactions-category-select-trigger'))
      fireEvent.click(screen.getByTestId(`transactions-category-select-option-${categoryValue}`))
    }

    function pickPaymentMethod(method: string) {
      fireEvent.click(screen.getByTestId('transactions-payment-method-select-trigger'))
      fireEvent.click(screen.getByTestId(`transactions-payment-method-select-option-${method}`))
    }

    it('shows a parent category together with its subcategories', () => {
      renderPage()
      pickCategory('c1')

      expect(screen.getByText('Starbucks')).toBeInTheDocument()
      expect(screen.getByText('Almuerzo')).toBeInTheDocument()
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument()
    })

    it('shows only the subcategory when a subcategory is selected', () => {
      renderPage()
      pickCategory('c3')

      expect(screen.getByText('Almuerzo')).toBeInTheDocument()
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument()
    })

    it('combines the category filter with the payment method filter', () => {
      renderPage()
      pickCategory('c1')
      pickPaymentMethod('Cash')

      expect(screen.getByText('Almuerzo')).toBeInTheDocument()
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument()
    })

    it('shows the category clear button only while a category is selected, and resets the filter', () => {
      renderPage()
      expect(screen.queryByTestId('transactions-category-filter-clear')).not.toBeInTheDocument()

      pickCategory('c2')
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTestId('transactions-category-filter-clear'))

      expect(screen.queryByTestId('transactions-category-filter-clear')).not.toBeInTheDocument()
      expect(screen.getByText('Starbucks')).toBeInTheDocument()
      expect(screen.getByText('Uber ride')).toBeInTheDocument()
    })

    it('shows the payment method clear button only while a method is selected, and resets the filter', () => {
      renderPage()
      expect(screen.queryByTestId('transactions-payment-method-filter-clear')).not.toBeInTheDocument()

      pickPaymentMethod('Cash')
      expect(screen.queryByText('Starbucks')).not.toBeInTheDocument()

      fireEvent.click(screen.getByTestId('transactions-payment-method-filter-clear'))

      expect(screen.queryByTestId('transactions-payment-method-filter-clear')).not.toBeInTheDocument()
      expect(screen.getByText('Starbucks')).toBeInTheDocument()
    })
  })
})
