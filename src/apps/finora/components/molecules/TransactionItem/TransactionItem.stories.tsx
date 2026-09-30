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
    refundedPurchase: {
      description: 'The purchase this reimbursement refunds, when linked (ADR-006).',
      control: false,
      table: { type: { summary: "Pick<TransactionWithCategory, 'id' | 'description'> | null" } },
    },
    refundsSummary: {
      description: "This purchase's linked reimbursements, when any exist (ADR-006).",
      control: false,
      table: { type: { summary: 'RefundSummary | null' } },
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
      refunds_transaction_id: null,
      last_installment_date: '2026-09-08',
      goal_transfer: null,
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
      refunds_transaction_id: null,
      last_installment_date: '2026-09-01',
      goal_transfer: null,
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
      refunds_transaction_id: null,
      last_installment_date: '2026-09-05',
      goal_transfer: null,
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
      refunds_transaction_id: null,
      last_installment_date: '2026-09-10',
      goal_transfer: null,
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
      refunds_transaction_id: null,
      last_installment_date: '2027-08-08',
      goal_transfer: { kind: 'withdrawal', goal_id: 'g1', amount: 20000, goal: { name: 'Vacation' } },
      category: { id: 'c5', name: 'Travel', icon: 'plane', color: '#0ea5e9' },
      payments: [{ id: 'p5', transaction_id: '5', payment_method: 'Credit Card', amount: 20000 }],
    },
    onDeleted: () => {},
  },
}

// ADR-006: a reimbursement linked to the purchase it refunds.
export const ReimbursementLinkedToPurchase = {
  args: {
    transaction: {
      id: '6',
      user_id: 'u1',
      description: 'Return - wrong size',
      amount: 40,
      type: 'reimbursement',
      category_id: 'c1',
      date: '2026-09-12',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      refunds_transaction_id: '1',
      last_installment_date: '2026-09-12',
      goal_transfer: null,
      category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#2563eb' },
      payments: [{ id: 'p6', transaction_id: '6', payment_method: 'Credit Card', amount: 40 }],
    },
    refundedPurchase: { id: '1', description: 'Starbucks' },
    onDeleted: () => {},
  },
}

// ADR-006: the linked purchase was covered by savings, so the refund returns
// the money to that Goal instead of widening the budget or the savings rate.
export const ReimbursementReturnedToGoal = {
  args: {
    transaction: {
      id: '7',
      user_id: 'u1',
      description: 'Airline refund',
      amount: 3000,
      type: 'reimbursement',
      category_id: 'c5',
      date: '2026-09-20',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'savings',
      refunds_transaction_id: '5',
      last_installment_date: '2026-09-20',
      goal_transfer: { kind: 'refund', goal_id: 'g1', amount: 3000, goal: { name: 'Vacation' } },
      category: { id: 'c5', name: 'Travel', icon: 'plane', color: '#0ea5e9' },
      payments: [{ id: 'p7', transaction_id: '7', payment_method: 'Credit Card', amount: 3000 }],
    },
    refundedPurchase: { id: '5', description: 'Flights to Madrid' },
    onDeleted: () => {},
  },
}

// ADR-006: a purchase with reimbursements linked to it.
export const PurchaseWithRefunds = {
  args: {
    ...Expense.args,
    refundsSummary: { count: 2, total: 45.5 },
  },
}

// ADR-009: split with the household partner. No signed-in user in Storybook
// (the norm - see .storybook/preview.tsx), so useHousehold() resolves to no
// partner name; the label still renders with the caller's own part.
export const SharedExpense = {
  args: {
    transaction: {
      id: '8',
      user_id: 'u1',
      description: 'Rent',
      amount: 1000,
      type: 'expense',
      category_id: 'c6',
      date: '2026-09-01',
      notes: null,
      created_at: null,
      installment_months: 1,
      funding_source: 'income',
      refunds_transaction_id: null,
      last_installment_date: '2026-09-01',
      goal_transfer: null,
      category: { id: 'c6', name: 'Housing', icon: 'home', color: '#7c3aed' },
      payments: [{ id: 'p8', transaction_id: '8', payment_method: 'Bank Transfer', amount: 1000 }],
      is_shared: true,
      shares: [
        { id: 's1', transaction_id: '8', user_id: 'u1', amount: 600 },
        { id: 's2', transaction_id: '8', user_id: 'u2', amount: 400 },
      ],
    },
    onDeleted: () => {},
  },
}
