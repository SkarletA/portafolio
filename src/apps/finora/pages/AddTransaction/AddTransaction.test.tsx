// Focused on the refund-link feature (ADR-006). AddTransaction has no broader
// test suite yet (pre-existing gap, out of this task's scope); these cover the
// new selector, its category lock and Goal notice, the client pre-checks, and
// the server error mapping.
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddTransaction } from './AddTransaction'
import { saveTransaction } from '@services/transactionsService'
import { useCategories } from '@hooks/useCategories'
import { useTransaction } from '@hooks/useTransaction'
import { useGoals } from '@hooks/useGoals'
import { useRefundablePurchases } from '@hooks/useRefundablePurchases'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('@services/transactionsService', async () => {
  const actual = await vi.importActual<typeof import('@services/transactionsService')>('@services/transactionsService')
  return { ...actual, saveTransaction: vi.fn() }
})
vi.mock('@services/categoriesService', () => ({ createCategory: vi.fn() }))
vi.mock('@hooks/useCategories', () => ({ useCategories: vi.fn() }))
vi.mock('@hooks/useTransaction', () => ({ useTransaction: vi.fn() }))
vi.mock('@hooks/useGoals', () => ({ useGoals: vi.fn() }))
vi.mock('@hooks/useRefundablePurchases', () => ({ useRefundablePurchases: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@example.com' } }) }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))

const food = { id: 'food', name: 'Food', icon: null, color: null, parent_id: null, translationKey: 'food' }
const travel = { id: 'travel', name: 'Travel', icon: null, color: null, parent_id: null, translationKey: 'travel' }

const shoesPurchase = {
  id: 'p1',
  type: 'expense' as const,
  description: 'Shoes',
  amount: 100,
  date: '2026-09-01',
  category_id: 'food',
  withdrawal: null,
  remaining: 60,
}

const laptopPurchase = {
  id: 'p2',
  type: 'expense' as const,
  description: 'Laptop',
  amount: 200,
  date: '2026-09-02',
  category_id: 'travel',
  withdrawal: { goal_id: 'g1', goal: { name: 'Vacation' } },
  remaining: 200,
}

const acceptedPartnerMember = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }
const bel = { user_id: 'u2', first_name: 'Bel', last_name: 'Suarez', avatar_url: null }

function mockHooks(purchases = [shoesPurchase, laptopPurchase], household: Record<string, unknown> = {}) {
  vi.mocked(useCategories).mockReturnValue({ categories: [food, travel], loading: false, error: null, refetch: vi.fn() } as never)
  vi.mocked(useTransaction).mockReturnValue({ transaction: null, loading: false, error: null } as never)
  vi.mocked(useGoals).mockReturnValue({ goals: [], loading: false } as never)
  vi.mocked(useRefundablePurchases).mockReturnValue({ purchases, loading: false, error: null } as never)
  // No household by default: most of these tests predate sharing (ADR-009),
  // so the shared-expense fieldset (gated on an accepted partner) stays
  // hidden, same as for every user without a household today.
  vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null, partner: null, ...household } as never)
}

function renderCreate() {
  render(
    <MemoryRouter initialEntries={['/finora/add-transaction']}>
      <Routes>
        <Route path="/finora/add-transaction" element={<AddTransaction mode="create" />} />
        <Route path="/finora/transactions" element={<p>transactions list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function selectReimbursementType() {
  fireEvent.click(screen.getByTestId('add-transaction-type-reimbursement-button'))
}

describe('AddTransaction refund link', () => {
  beforeEach(() => {
    vi.mocked(saveTransaction).mockReset()
  })

  it('offers no refund link selector for an expense or income', () => {
    mockHooks()
    renderCreate()

    expect(screen.queryByTestId('add-transaction-refund-link-select-trigger')).not.toBeInTheDocument()
  })

  it('locks the category to the linked purchase and shows a hint', () => {
    mockHooks()
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))

    expect(screen.getByTestId('add-transaction-category-select-trigger')).toBeDisabled()
    expect(screen.getByText('transactions:form.refundCategoryLockedHint')).toBeInTheDocument()
  })

  it('warns that a savings-funded purchase will get its refund back, naming the goal', () => {
    mockHooks()
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p2'))

    expect(screen.getByTestId('add-transaction-refund-goal-notice')).toHaveTextContent(
      /form\.refundGoalNotice/
    )
    expect(screen.getByTestId('add-transaction-refund-goal-notice')).toHaveTextContent('"goal":"Vacation"')
  })

  it('shows no goal notice for a purchase funded by income', () => {
    mockHooks()
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))

    expect(screen.queryByTestId('add-transaction-refund-goal-notice')).not.toBeInTheDocument()
  })

  it('rejects a refund dated before its purchase, without calling the server', () => {
    mockHooks()
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))
    fireEvent.change(screen.getByTestId('add-transaction-date-input'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Refund' } })
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-option-Cash'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(screen.getByText('transactions:validation.refundBeforePurchase')).toBeInTheDocument()
    expect(saveTransaction).not.toHaveBeenCalled()
  })

  it("rejects an amount over the purchase's remaining, without calling the server", () => {
    mockHooks()
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))
    fireEvent.change(screen.getByTestId('add-transaction-date-input'), { target: { value: '2026-09-05' } })
    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '70' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Refund' } })
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-option-Cash'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(screen.getByText('transactions:validation.refundExceedsPurchase:{"remaining":"$60.00"}')).toBeInTheDocument()
    expect(saveTransaction).not.toHaveBeenCalled()
  })

  it('sends null for a standalone reimbursement', async () => {
    mockHooks()
    vi.mocked(saveTransaction).mockResolvedValue({ error: null } as never)
    renderCreate()
    selectReimbursementType()

    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Refund' } })
    fireEvent.click(screen.getByTestId('add-transaction-category-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-category-select-option-food'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-option-Cash'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalledTimes(1))
    expect(vi.mocked(saveTransaction).mock.calls[0][1]).toEqual(expect.objectContaining({ refunds_transaction_id: null }))
  })

  it('sends the id of the chosen purchase', async () => {
    mockHooks()
    vi.mocked(saveTransaction).mockResolvedValue({ error: null } as never)
    renderCreate()
    selectReimbursementType()

    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))
    fireEvent.change(screen.getByTestId('add-transaction-date-input'), { target: { value: '2026-09-05' } })
    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Refund' } })
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-option-Cash'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalledTimes(1))
    expect(vi.mocked(saveTransaction).mock.calls[0][1]).toEqual(expect.objectContaining({ refunds_transaction_id: 'p1' }))
  })

  it.each([
    ['invalid_refund_link', 'transactions:validation.invalidRefundLink'],
    ['refund_category_mismatch', 'transactions:validation.refundCategoryMismatch'],
    ['refund_before_purchase', 'transactions:validation.refundBeforePurchase'],
  ])('maps %s to a translated message', async (code, expectedText) => {
    mockHooks()
    vi.mocked(saveTransaction).mockResolvedValue({ error: { code: 'P0001', message: code } } as never)
    renderCreate()
    selectReimbursementType()

    // Linked to Shoes (dated 2026-09-01), which fills the category too.
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-refund-link-select-option-p1'))
    fireEvent.change(screen.getByTestId('add-transaction-date-input'), { target: { value: '2026-09-05' } })
    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Refund' } })
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-received-via-select-option-Cash'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(screen.getByText(expectedText)).toBeInTheDocument())
  })

  it('shows a clear, top-level message when a purchase is frozen by linked refunds', async () => {
    mockHooks()
    vi.mocked(saveTransaction).mockResolvedValue({ error: { code: 'P0001', message: 'purchase_has_linked_refunds' } } as never)
    renderCreate()

    // The default type is 'expense', so this saves the purchase itself.
    fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: '50' } })
    fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Shoes' } })
    fireEvent.click(screen.getByTestId('add-transaction-category-select-trigger'))
    fireEvent.click(screen.getByTestId('add-transaction-category-select-option-food'))
    fireEvent.click(screen.getByTestId('add-transaction-payment-cash-checkbox'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(screen.getByText('transactions:validation.purchaseHasLinkedRefunds')).toBeInTheDocument())
  })

  it("preloads the linked purchase and locks the category when editing a linked reimbursement", () => {
    mockHooks()
    vi.mocked(useTransaction).mockReturnValue({
      transaction: {
        id: 't1',
        user_id: 'u1',
        description: 'Refund',
        amount: 40,
        type: 'reimbursement',
        category_id: 'food',
        date: '2026-09-05',
        notes: null,
        created_at: null,
        installment_months: 1,
        funding_source: 'income',
        refunds_transaction_id: 'p1',
        last_installment_date: '2026-09-05',
        goal_transfer: null,
        category: food,
        payments: [{ id: 'pay1', transaction_id: 't1', payment_method: 'Cash', amount: 40 }],
      },
      loading: false,
      error: null,
    } as never)

    render(
      <MemoryRouter initialEntries={['/finora/transactions/t1/edit']}>
        <Routes>
          <Route path="/finora/transactions/:id/edit" element={<AddTransaction mode="edit" />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('add-transaction-refund-link-select-trigger')).toHaveTextContent(/Shoes/)
    expect(screen.getByTestId('add-transaction-category-select-trigger')).toBeDisabled()
  })
})

function fillBasicExpenseFields(amount: string) {
  fireEvent.change(screen.getByTestId('add-transaction-amount-input'), { target: { value: amount } })
  fireEvent.change(screen.getByTestId('add-transaction-description-input'), { target: { value: 'Rent' } })
  fireEvent.click(screen.getByTestId('add-transaction-category-select-trigger'))
  fireEvent.click(screen.getByTestId('add-transaction-category-select-option-food'))
  fireEvent.click(screen.getByTestId('add-transaction-payment-cash-checkbox'))
}

describe('AddTransaction shared expense', () => {
  beforeEach(() => {
    vi.mocked(saveTransaction).mockReset()
  })

  it('offers no shared-expense section without an accepted household partner', () => {
    mockHooks(undefined, { partnerMember: null })
    renderCreate()

    expect(screen.queryByTestId('add-transaction-shared-checkbox')).not.toBeInTheDocument()
  })

  it('offers no shared-expense section while the partner has only a pending invitation', () => {
    mockHooks(undefined, { partnerMember: { ...acceptedPartnerMember, status: 'pending' } })
    renderCreate()

    expect(screen.queryByTestId('add-transaction-shared-checkbox')).not.toBeInTheDocument()
  })

  it('reveals the split once shared, with the partner amount computed as the exact remainder', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    renderCreate()

    expect(screen.queryByTestId('add-transaction-own-share-input')).not.toBeInTheDocument()

    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))
    fireEvent.change(screen.getByTestId('add-transaction-own-share-input'), { target: { value: '60' } })

    expect(screen.getByTestId('add-transaction-partner-share-hint')).toHaveTextContent('"amount":"$40.00"')
  })

  it('rejects an own share of 0 or the full amount, without calling the server', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    renderCreate()
    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))

    fireEvent.change(screen.getByTestId('add-transaction-own-share-input'), { target: { value: '100' } })
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(screen.getByText('transactions:validation.shareAmountRange')).toBeInTheDocument()
    expect(saveTransaction).not.toHaveBeenCalled()
  })

  it('sends the split, exactly the caller and the household partner, summing to the total', async () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(saveTransaction).mockResolvedValue({ data: 't1', error: null } as never)
    renderCreate()
    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))
    fireEvent.change(screen.getByTestId('add-transaction-own-share-input'), { target: { value: '60' } })
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalled())
    expect(vi.mocked(saveTransaction).mock.calls[0][1].shares).toEqual([
      { user_id: 'u1', amount: 60 },
      { user_id: 'u2', amount: 40 },
    ])
  })

  it('disables the shared-expense checkbox while financed or savings-funded, and vice versa', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    renderCreate()

    fireEvent.click(screen.getByTestId('add-transaction-financed-checkbox'))
    expect(screen.getByTestId('add-transaction-shared-checkbox')).toBeDisabled()

    fireEvent.click(screen.getByTestId('add-transaction-financed-checkbox'))
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))
    expect(screen.getByTestId('add-transaction-financed-checkbox')).toBeDisabled()
    expect(screen.getByTestId('add-transaction-savings-funded-checkbox')).toBeDisabled()
  })

  it('maps a rejected household or split to the share field', async () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(saveTransaction).mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'household_required_for_shared_expense' },
    } as never)
    renderCreate()
    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))
    fireEvent.change(screen.getByTestId('add-transaction-own-share-input'), { target: { value: '60' } })
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(await screen.findByText('transactions:validation.shareNoLongerValid')).toBeInTheDocument()
  })

  it('preloads an existing shared transaction with the caller\'s own part', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(useTransaction).mockReturnValue({
      transaction: {
        id: 't1',
        user_id: 'u1',
        description: 'Rent',
        amount: 1000,
        type: 'expense',
        category_id: 'food',
        date: '2026-09-05',
        notes: null,
        created_at: null,
        installment_months: 1,
        funding_source: 'income',
        refunds_transaction_id: null,
        last_installment_date: '2026-09-05',
        goal_transfer: null,
        category: food,
        payments: [{ id: 'pay1', transaction_id: 't1', payment_method: 'Cash', amount: 1000 }],
        is_shared: true,
        shares: [
          { id: 's1', transaction_id: 't1', user_id: 'u1', amount: 600 },
          { id: 's2', transaction_id: 't1', user_id: 'u2', amount: 400 },
        ],
      },
      loading: false,
      error: null,
    } as never)

    render(
      <MemoryRouter initialEntries={['/finora/transactions/t1/edit']}>
        <Routes>
          <Route path="/finora/transactions/:id/edit" element={<AddTransaction mode="edit" />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('add-transaction-shared-checkbox')).toBeChecked()
    expect(screen.getByTestId('add-transaction-own-share-input')).toHaveValue(600)
  })
})

describe('AddTransaction household expense (Case B, no split)', () => {
  beforeEach(() => {
    vi.mocked(saveTransaction).mockReset()
  })

  it('sends is_household_expense with no shares, unlike a split', async () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(saveTransaction).mockResolvedValue({ data: 't1', error: null } as never)
    renderCreate()
    fillBasicExpenseFields('250')
    fireEvent.click(screen.getByTestId('add-transaction-household-expense-checkbox'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalled())
    const sentInput = vi.mocked(saveTransaction).mock.calls[0][1]
    expect(sentInput.is_household_expense).toBe(true)
    expect(sentInput.shares).toBeUndefined()
  })

  it('disables the split checkbox while household-expense is checked, and vice versa', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    renderCreate()

    fireEvent.click(screen.getByTestId('add-transaction-household-expense-checkbox'))
    expect(screen.getByTestId('add-transaction-shared-checkbox')).toBeDisabled()

    fireEvent.click(screen.getByTestId('add-transaction-household-expense-checkbox'))
    fireEvent.click(screen.getByTestId('add-transaction-shared-checkbox'))
    expect(screen.getByTestId('add-transaction-household-expense-checkbox')).toBeDisabled()
  })

  it('unlike a split, allows combining household-expense with financed or savings-funded', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    renderCreate()

    fireEvent.click(screen.getByTestId('add-transaction-financed-checkbox'))
    expect(screen.getByTestId('add-transaction-household-expense-checkbox')).toBeEnabled()

    fireEvent.click(screen.getByTestId('add-transaction-household-expense-checkbox'))
    expect(screen.getByTestId('add-transaction-household-expense-checkbox')).toBeChecked()
  })

  it('preloads an existing household-tagged transaction', () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(useTransaction).mockReturnValue({
      transaction: {
        id: 't1',
        user_id: 'u1',
        description: 'Medicine',
        amount: 250,
        type: 'expense',
        category_id: 'food',
        date: '2026-09-05',
        notes: null,
        created_at: null,
        installment_months: 1,
        funding_source: 'income',
        refunds_transaction_id: null,
        last_installment_date: '2026-09-05',
        goal_transfer: null,
        category: food,
        payments: [{ id: 'pay1', transaction_id: 't1', payment_method: 'Cash', amount: 250 }],
        is_shared: false,
        shares: [],
        is_household_expense: true,
      },
      loading: false,
      error: null,
    } as never)

    render(
      <MemoryRouter initialEntries={['/finora/transactions/t1/edit']}>
        <Routes>
          <Route path="/finora/transactions/:id/edit" element={<AddTransaction mode="edit" />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('add-transaction-household-expense-checkbox')).toBeChecked()
  })

  it('maps a rejected household tag to the share field', async () => {
    mockHooks(undefined, { partnerMember: acceptedPartnerMember, partner: bel })
    vi.mocked(saveTransaction).mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'household_required_for_household_expense' },
    } as never)
    renderCreate()
    fillBasicExpenseFields('250')
    fireEvent.click(screen.getByTestId('add-transaction-household-expense-checkbox'))
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(await screen.findByText('transactions:validation.shareNoLongerValid')).toBeInTheDocument()
  })
})

describe('AddTransaction single payment method', () => {
  beforeEach(() => {
    vi.mocked(saveTransaction).mockReset()
    mockHooks()
  })

  it('hides the amount for an expense paid with one method, and sends the total as that payment', async () => {
    vi.mocked(saveTransaction).mockResolvedValue({ data: 't1', error: null } as never)
    renderCreate()
    fillBasicExpenseFields('100')

    expect(screen.queryByTestId('add-transaction-payment-cash-amount-input')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    await waitFor(() => expect(saveTransaction).toHaveBeenCalled())
    expect(vi.mocked(saveTransaction).mock.calls[0][1].payments).toEqual([{ payment_method: 'Cash', amount: 100 }])
  })

  it('still asks for an amount per method when two methods are checked', () => {
    renderCreate()
    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-payment-credit-card-checkbox'))

    expect(screen.getByTestId('add-transaction-payment-cash-amount-input')).toBeInTheDocument()
    expect(screen.getByTestId('add-transaction-payment-credit-card-amount-input')).toBeInTheDocument()
  })

  it('rejects two methods whose amounts do not add up to the total, without calling the server', () => {
    renderCreate()
    fillBasicExpenseFields('100')
    fireEvent.click(screen.getByTestId('add-transaction-payment-credit-card-checkbox'))
    fireEvent.change(screen.getByTestId('add-transaction-payment-cash-amount-input'), { target: { value: '30' } })
    fireEvent.change(screen.getByTestId('add-transaction-payment-credit-card-amount-input'), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-transaction-save-button'))

    expect(screen.getByRole('alert')).toHaveTextContent('transactions:validation.assignedMustEqualTotal')
    expect(saveTransaction).not.toHaveBeenCalled()
  })
})
