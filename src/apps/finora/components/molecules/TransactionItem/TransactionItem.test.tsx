import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TransactionItem } from './TransactionItem'
import type { TransactionWithCategory } from '../../../services/transactionsService'

const baseTransaction: TransactionWithCategory = {
  id: '1',
  user_id: 'u1',
  description: 'Starbucks',
  amount: 120,
  type: 'expense',
  category_id: 'c1',
  payment_method: 'Credit Card',
  date: '2026-09-08',
  notes: null,
  created_at: null,
  category: { id: 'c1', name: 'Food', icon: null, color: null },
}

describe('TransactionItem', () => {
  it('renders an expense with a negative, danger-colored amount', () => {
    render(<TransactionItem transaction={baseTransaction} />)

    expect(screen.getByText('Starbucks')).toBeInTheDocument()
    expect(screen.getByText('-$120')).toBeInTheDocument()
    expect(screen.getByText(/Food/)).toBeInTheDocument()
  })

  it('renders an income with a positive amount', () => {
    render(
      <TransactionItem
        transaction={{ ...baseTransaction, type: 'income', amount: 35000, description: 'Salary' }}
      />
    )

    expect(screen.getByText('+$35,000')).toBeInTheDocument()
  })
})
