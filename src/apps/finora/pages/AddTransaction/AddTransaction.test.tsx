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

function mockHooks(purchases = [shoesPurchase, laptopPurchase]) {
  vi.mocked(useCategories).mockReturnValue({ categories: [food, travel], loading: false, error: null, refetch: vi.fn() } as never)
  vi.mocked(useTransaction).mockReturnValue({ transaction: null, loading: false, error: null } as never)
  vi.mocked(useGoals).mockReturnValue({ goals: [], loading: false } as never)
  vi.mocked(useRefundablePurchases).mockReturnValue({ purchases, loading: false, error: null } as never)
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
    fireEvent.change(screen.getByTestId('add-transaction-payment-cash-amount-input'), { target: { value: '50' } })
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
