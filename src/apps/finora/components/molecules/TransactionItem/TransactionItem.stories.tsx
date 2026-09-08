import { TransactionItem } from './TransactionItem'

export default {
  title: 'Finora/Molecules/TransactionItem',
  component: TransactionItem,
}

export const Expense = {
  args: {
    transaction: {
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
    },
  },
}

export const Income = {
  args: {
    transaction: {
      id: '2',
      user_id: 'u1',
      description: 'Salary',
      amount: 35000,
      type: 'income',
      category_id: 'c2',
      payment_method: 'Bank',
      date: '2026-09-01',
      notes: null,
      created_at: null,
      category: { id: 'c2', name: 'Income', icon: null, color: null },
    },
  },
}
