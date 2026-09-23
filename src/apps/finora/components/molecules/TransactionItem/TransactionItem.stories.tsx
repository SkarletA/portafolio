import { TransactionItem } from './TransactionItem'

export default {
  title: 'Finora/Molecules/TransactionItem',
  component: TransactionItem,
  parameters: {
    docs: {
      description: {
        component:
          'A single transaction row: description, category, date, signed amount, and edit/delete actions.',
      },
    },
  },
  argTypes: {
    transaction: {
      description: 'The transaction to display, including its category and payment method breakdown.',
      control: false,
      table: { type: { summary: 'TransactionWithCategory' } },
    },
    onDeleted: {
      description: 'Called after a successful delete, so the caller can refresh its list.',
      action: 'deleted',
      table: { type: { summary: 'function' } },
    },
  },
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
      date: '2026-09-08',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      last_installment_date: '2026-09-08',
      category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#2563eb' },
      payments: [{ id: 'p1', transaction_id: '1', payment_method: 'Credit Card', amount: 120 }],
    },
    onDeleted: () => {},
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
      date: '2026-09-01',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      last_installment_date: '2026-09-01',
      category: { id: 'c2', name: 'Income', icon: null, color: null },
      payments: [{ id: 'p2', transaction_id: '2', payment_method: 'Bank Transfer', amount: 35000 }],
    },
    onDeleted: () => {},
  },
}

export const Reimbursement = {
  args: {
    transaction: {
      id: '3',
      user_id: 'u1',
      description: 'Insurance refund',
      amount: 50,
      type: 'reimbursement',
      category_id: 'c1',
      date: '2026-09-05',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      last_installment_date: '2026-09-05',
      category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#2563eb' },
      payments: [{ id: 'p3', transaction_id: '3', payment_method: 'Credit Card', amount: 50 }],
    },
    onDeleted: () => {},
  },
}

export const SplitPayment = {
  args: {
    transaction: {
      id: '4',
      user_id: 'u1',
      description: 'Groceries',
      amount: 200,
      type: 'expense',
      category_id: 'c1',
      date: '2026-09-10',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      last_installment_date: '2026-09-10',
      category: { id: 'c1', name: 'Food', icon: 'shopping-cart', color: '#2563eb' },
      payments: [
        { id: 'p4', transaction_id: '4', payment_method: 'Grocery Vouchers', amount: 80 },
        { id: 'p5', transaction_id: '4', payment_method: 'Credit Card', amount: 120 },
      ],
    },
    onDeleted: () => {},
  },
}

export const FinancedCoveredBySavings = {
  args: {
    transaction: {
      id: '5',
      user_id: 'u1',
      description: 'Flights to Madrid',
      amount: 20000,
      type: 'expense',
      category_id: 'c5',
      date: '2026-09-08',
      notes: null,
      created_at: null,
      installment_months: 12,
      funding_source: 'savings',
      last_installment_date: '2027-08-08',
      category: { id: 'c5', name: 'Travel', icon: 'plane', color: '#0ea5e9' },
      payments: [{ id: 'p5', transaction_id: '5', payment_method: 'Credit Card', amount: 20000 }],
    },
    onDeleted: () => {},
  },
}
