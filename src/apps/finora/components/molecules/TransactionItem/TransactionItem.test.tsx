import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransactionItem } from './TransactionItem'
import { deleteTransaction } from '@services/transactionsService'
import type { TransactionWithCategory } from '@services/transactionsService'

vi.mock('../../../services/transactionsService', async () => {
  const actual = await vi.importActual<typeof import('@services/transactionsService')>(
    '../../../services/transactionsService'
  )
  return { ...actual, deleteTransaction: vi.fn() }
})

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

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
  last_installment_date: '2026-09-08',
  withdrawal: null,
  category: { id: 'c1', name: 'Food', icon: null, color: null, translationKey: null },
  payments: [{ id: 'p1', transaction_id: '1', payment_method: 'Credit Card', amount: 120 }],
}

function renderItem(transaction: TransactionWithCategory, onDeleted = vi.fn()) {
  return render(
    <MemoryRouter>
      <TransactionItem transaction={transaction} onDeleted={onDeleted} />
    </MemoryRouter>
  )
}

describe('TransactionItem', () => {
  beforeEach(() => {
    vi.mocked(deleteTransaction).mockReset()
  })

  it('renders an expense with a negative, danger-colored amount', () => {
    renderItem(baseTransaction)

    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getByText('-$120')).toBeInTheDocument()
    expect(screen.getByText(/Food/)).toBeInTheDocument()
  })

  it('renders an income with a positive amount', () => {
    renderItem({ ...baseTransaction, type: 'income', amount: 35000, description: 'Salary' })

    expect(screen.getByText('+$35,000')).toBeInTheDocument()
  })

  it('renders a reimbursement with a positive, primary-colored amount', () => {
    renderItem({ ...baseTransaction, type: 'reimbursement', amount: 50, description: 'Refund' })

    const amount = screen.getByText('+$50')
    expect(amount.className).toContain('reimbursement')
  })

  it('shows the payment method breakdown for a single payment', () => {
    renderItem(baseTransaction)

    expect(screen.getByText('Food · Credit Card')).toBeInTheDocument()
  })

  it('shows the payment method breakdown for multiple payments without amounts', () => {
    renderItem({
      ...baseTransaction,
      payments: [
        { id: 'p1', transaction_id: '1', payment_method: 'Credit Card', amount: 80 },
        { id: 'p2', transaction_id: '1', payment_method: 'Grocery Vouchers', amount: 40 },
      ],
    })

    expect(screen.getByText('Food · Credit Card + Grocery Vouchers')).toBeInTheDocument()
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

    expect(screen.getByText('-$20,000')).toBeInTheDocument()
    expect(screen.getByText(/item\.installmentsSummary:\{"count":12,"amount":"\$1,667"\}/)).toBeInTheDocument()
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
      withdrawal: { goal_id: 'g1', amount: 120, goal: { name: 'Vacation' } },
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
})
