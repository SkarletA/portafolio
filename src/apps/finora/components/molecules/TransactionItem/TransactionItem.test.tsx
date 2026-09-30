import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionItem } from './TransactionItem'
import { deleteTransaction } from '@services/transactionsService'
import { useHousehold } from '@context/HouseholdContext'
import type { TransactionWithCategory } from '@services/transactionsService'
import { PurchaseHasLinkedRefundsError } from '@services/moneyMovementErrors'

vi.mock('../../../services/transactionsService', async () => {
  const actual = await vi.importActual<typeof import('@services/transactionsService')>(
    '../../../services/transactionsService'
  )
  return { ...actual, deleteTransaction: vi.fn() }
})

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@example.com' } }) }))
vi.mock('../../../context/HouseholdContext', () => ({ useHousehold: vi.fn() }))

const baseTransaction: TransactionWithCategory = {
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
}

function renderItem(
  transaction: TransactionWithCategory,
  onDeleted = vi.fn(),
  extra: { refundedPurchase?: Pick<TransactionWithCategory, 'id' | 'description'> | null; refundsSummary?: { count: number; total: number } | null } = {}
) {
  return render(
    <MemoryRouter>
      <TransactionItem transaction={transaction} onDeleted={onDeleted} {...extra} />
    </MemoryRouter>
  )
}

describe('TransactionItem', () => {
  beforeEach(() => {
    vi.mocked(deleteTransaction).mockReset()
    vi.mocked(useHousehold).mockReturnValue({
      partner: { user_id: 'u2', first_name: 'Bel', last_name: 'Suarez', avatar_url: null },
    } as never)
  })

  it('shows a split chip for each person, never truncated inline text', () => {
    renderItem({
      ...baseTransaction,
      is_shared: true,
      shares: [
        { id: 's1', transaction_id: '1', user_id: 'u1', amount: 72 },
        { id: 's2', transaction_id: '1', user_id: 'u2', amount: 48 },
      ],
    })

    expect(screen.getByText('item.chipYou:{"amount":"$72.00"}')).toBeInTheDocument()
    expect(screen.getByText('item.chipOther:{"name":"Bel Suarez","amount":"$48.00"}')).toBeInTheDocument()
  })

  it('shows no split chips for a personal expense', () => {
    renderItem(baseTransaction)

    expect(screen.queryByText(/item\.chipYou/)).not.toBeInTheDocument()
    expect(screen.queryByText(/item\.chipOther/)).not.toBeInTheDocument()
  })

  it('shows edit and delete for the signed-in user\'s own row', () => {
    renderItem(baseTransaction)

    expect(screen.getByTestId('transaction-item-1-edit-icon')).toBeInTheDocument()
    expect(screen.getByTestId('transaction-item-1-delete-icon')).toBeInTheDocument()
  })

  it("hides edit and delete for a household partner's row, and names them instead", () => {
    renderItem({ ...baseTransaction, user_id: 'u2' })

    expect(screen.queryByTestId('transaction-item-1-edit-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('transaction-item-1-delete-icon')).not.toBeInTheDocument()
    expect(screen.getByText(/item\.paidBy:\{"who":"Bel Suarez"\}/)).toBeInTheDocument()
  })

  it('renders an expense with a negative, danger-colored amount', () => {
    renderItem(baseTransaction)

    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getByText('-$120.00')).toBeInTheDocument()
    expect(screen.getByText(/Food/)).toBeInTheDocument()
  })

  it('shows the cents of an amount instead of rounding it to whole units', () => {
    renderItem({ ...baseTransaction, amount: 550.45 })

    expect(screen.getByText('-$550.45')).toBeInTheDocument()
  })

  it('renders an income with a positive amount', () => {
    renderItem({ ...baseTransaction, type: 'income', amount: 35000, description: 'Salary' })

    expect(screen.getByText('+$35,000.00')).toBeInTheDocument()
  })

  it('renders a reimbursement with a positive, primary-colored amount', () => {
    renderItem({ ...baseTransaction, type: 'reimbursement', amount: 50, description: 'Refund' })

    const amount = screen.getByText('+$50.00')
    expect(amount.className).toContain('reimbursement')
  })

  it('shows the payment method breakdown for a single payment', () => {
    renderItem(baseTransaction)

    expect(screen.getByText('Food · item.paidBy:{"who":"item.you"} · Credit Card')).toBeInTheDocument()
  })

  it('shows the payment method breakdown for multiple payments without amounts', () => {
    renderItem({
      ...baseTransaction,
      payments: [
        { id: 'p1', transaction_id: '1', payment_method: 'Credit Card', amount: 80 },
        { id: 'p2', transaction_id: '1', payment_method: 'Grocery Vouchers', amount: 40 },
      ],
    })

    expect(
      screen.getByText('Food · item.paidBy:{"who":"item.you"} · Credit Card + Grocery Vouchers')
    ).toBeInTheDocument()
  })

  it('confirms and deletes a transaction, calling onDeleted on success', async () => {
    const onDeleted = vi.fn()
    vi.mocked(deleteTransaction).mockResolvedValue({ error: null } as never)

    renderItem(baseTransaction, onDeleted)

    fireEvent.click(screen.getByTestId('transaction-item-1-delete-icon'))
    expect(screen.getByText('item.confirmDelete:{"description":"Starbucks"}')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('transaction-item-1-confirm-delete-button'))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(deleteTransaction).toHaveBeenCalledWith('1')
  })

  it('shows the monthly payments of a financed purchase next to its full amount', () => {
    renderItem({ ...baseTransaction, amount: 20000, installment_months: 12, last_installment_date: '2027-08-08' })

    expect(screen.getByText('-$20,000.00')).toBeInTheDocument()
    expect(screen.getByText(/item\.installmentsSummary:\{"count":12,"amount":"\$1,666.67"\}/)).toBeInTheDocument()
  })

  it('shows the count without an amount when a financed purchase cannot be split exactly', () => {
    renderItem({ ...baseTransaction, amount: 100.005, installment_months: 3 })

    expect(screen.getByText(/item\.installmentsCount:\{"count":3\}/)).toBeInTheDocument()
  })

  it('labels an expense covered by savings in text, not only color', () => {
    renderItem({ ...baseTransaction, funding_source: 'savings' })

    expect(screen.getByText(/item\.coveredBySavings/)).toBeInTheDocument()
  })

  it('names the goal an expense covered by savings came from', () => {
    renderItem({
      ...baseTransaction,
      funding_source: 'savings',
      refunds_transaction_id: null,
      goal_transfer: { kind: 'withdrawal', goal_id: 'g1', amount: 120, goal: { name: 'Vacation' } },
    })

    expect(screen.getByText(/item\.coveredBySavingsFrom:\{"goal":"Vacation"\}/)).toBeInTheDocument()
  })

  it('shows neither label for a single payment funded by income', () => {
    renderItem(baseTransaction)

    expect(screen.queryByText(/item\.installments/)).not.toBeInTheDocument()
    expect(screen.queryByText(/item\.coveredBySavings/)).not.toBeInTheDocument()
  })

  it('warns that deleting a financed purchase removes all its monthly payments', () => {
    renderItem({ ...baseTransaction, amount: 20000, installment_months: 12 })

    fireEvent.click(screen.getByTestId('transaction-item-1-delete-icon'))

    expect(screen.getByText('item.confirmDeleteFinanced:{"description":"Starbucks","count":12}')).toBeInTheDocument()
  })

  it('cancels the delete confirmation without deleting', () => {
    renderItem(baseTransaction)

    fireEvent.click(screen.getByTestId('transaction-item-1-delete-icon'))
    fireEvent.click(screen.getByTestId('transaction-item-1-cancel-delete-button'))

    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(deleteTransaction).not.toHaveBeenCalled()
  })

  it('names the purchase a linked reimbursement refunds', () => {
    renderItem(
      { ...baseTransaction, type: 'reimbursement', amount: 40, description: 'Refund', refunds_transaction_id: 'p1' },
      vi.fn(),
      { refundedPurchase: { id: 'p1', description: 'Shoes' } }
    )

    expect(screen.getByText(/item\.refundOf:\{"description":"Shoes"\}/)).toBeInTheDocument()
  })

  it('says a reimbursement returned money to its goal, in text, not just color', () => {
    renderItem({
      ...baseTransaction,
      type: 'reimbursement',
      amount: 40,
      funding_source: 'savings',
      refunds_transaction_id: 'p1',
      goal_transfer: { kind: 'refund', goal_id: 'g1', amount: 40, goal: { name: 'Vacation' } },
    })

    expect(screen.getByText(/item\.refundReturnedToGoalFrom:\{"goal":"Vacation"\}/)).toBeInTheDocument()
    expect(screen.queryByText(/item\.coveredBySavings/)).not.toBeInTheDocument()
  })

  it('falls back to a goal-less label when a savings refund has no goal name yet', () => {
    renderItem({
      ...baseTransaction,
      type: 'reimbursement',
      amount: 40,
      funding_source: 'savings',
      refunds_transaction_id: 'p1',
    })

    expect(screen.getByText(/item\.refundReturnedToGoal\b/)).toBeInTheDocument()
  })

  it('never shows "covered by savings" for a reimbursement, even when funding_source is savings', () => {
    renderItem({ ...baseTransaction, type: 'reimbursement', amount: 40, funding_source: 'savings' })

    expect(screen.queryByText(/item\.coveredBySavings\b/)).not.toBeInTheDocument()
  })

  it("summarizes a purchase's linked reimbursements", () => {
    renderItem(baseTransaction, vi.fn(), { refundsSummary: { count: 2, total: 70 } })

    expect(screen.getByText(/item\.refundsSummary:\{"count":2,"total":"\$70.00"\}/)).toBeInTheDocument()
  })

  it('names the linked reimbursements that block deleting a purchase', async () => {
    vi.mocked(deleteTransaction).mockResolvedValue({
      error: new PurchaseHasLinkedRefundsError([
        { id: 'r1', description: 'Refund 1', amount: 20, date: '2026-09-10' },
        { id: 'r2', description: 'Refund 2', amount: 30, date: '2026-09-11' },
      ]),
    } as never)

    renderItem(baseTransaction)

    fireEvent.click(screen.getByTestId('transaction-item-1-delete-icon'))
    fireEvent.click(screen.getByTestId('transaction-item-1-confirm-delete-button'))

    await waitFor(() =>
      expect(
        screen.getByText(
          'item.deleteBlockedByRefunds:{"count":2,"list":"item.refundListItem:{\\"description\\":\\"Refund 1\\",\\"amount\\":\\"$20.00\\"}, item.refundListItem:{\\"description\\":\\"Refund 2\\",\\"amount\\":\\"$30.00\\"}"}'
        )
      ).toBeInTheDocument()
    )
  })

  it('shows a clear message when deleting a reimbursement whose goal already spent the money', async () => {
    vi.mocked(deleteTransaction).mockResolvedValue({
      error: { code: 'P0001', message: 'goal_balance_negative' },
    } as never)

    renderItem({ ...baseTransaction, type: 'reimbursement', amount: 40 })

    fireEvent.click(screen.getByTestId('transaction-item-1-delete-icon'))
    fireEvent.click(screen.getByTestId('transaction-item-1-confirm-delete-button'))

    await waitFor(() => expect(screen.getByText('item.goalBalanceNegative')).toBeInTheDocument())
  })
})
