import { MOCK_USER_ID } from './supabaseAuth'

// Shared fixture rows for the Supabase tables every hook-driven Finora page
// hits on mount (transactions, categories, budgets, goals, profiles). One
// consistent dataset so a category/budget/goal means the same thing whichever
// page's story renders it.

export const CATEGORY_FOOD = { id: 'cat-food', name: 'Food', icon: 'utensils', color: '#f59e0b', translationKey: 'food' }
export const CATEGORY_TRANSPORT = { id: 'cat-transport', name: 'Transport', icon: 'car', color: '#3b82f6', translationKey: 'transport' }
export const CATEGORY_HOME = { id: 'cat-home', name: 'Home', icon: 'home', color: '#8b5cf6', translationKey: 'home' }

export const CATEGORIES = [
  { ...CATEGORY_FOOD, parent_id: null },
  { ...CATEGORY_TRANSPORT, parent_id: null },
  { ...CATEGORY_HOME, parent_id: null },
]

function transaction(overrides: Record<string, unknown>) {
  return {
    id: 't1',
    user_id: MOCK_USER_ID,
    description: '',
    amount: 0,
    type: 'expense',
    category_id: null,
    date: '2026-09-01',
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    installment_months: 1,
    funding_source: 'income',
    refunds_transaction_id: null,
    last_installment_date: overrides.date ?? '2026-09-01',
    goal_transfer: null,
    category: null,
    payments: [],
    ...overrides,
  }
}

export const TRANSACTIONS = [
  transaction({
    id: 't1',
    description: 'Salary',
    amount: 3200,
    type: 'income',
    date: '2026-09-01',
    last_installment_date: '2026-09-01',
    payments: [{ id: 'p1', transaction_id: 't1', payment_method: 'Bank Transfer', amount: 3200 }],
  }),
  transaction({
    id: 't2',
    description: 'Rent',
    amount: 900,
    category_id: CATEGORY_HOME.id,
    category: CATEGORY_HOME,
    date: '2026-09-02',
    last_installment_date: '2026-09-02',
    payments: [{ id: 'p2', transaction_id: 't2', payment_method: 'Bank Transfer', amount: 900 }],
  }),
  transaction({
    id: 't3',
    description: 'Groceries',
    amount: 85.5,
    category_id: CATEGORY_FOOD.id,
    category: CATEGORY_FOOD,
    date: '2026-09-05',
    last_installment_date: '2026-09-05',
    payments: [{ id: 'p3', transaction_id: 't3', payment_method: 'Debit Card', amount: 85.5 }],
  }),
  transaction({
    id: 't4',
    description: 'Gas',
    amount: 45,
    category_id: CATEGORY_TRANSPORT.id,
    category: CATEGORY_TRANSPORT,
    date: '2026-09-10',
    last_installment_date: '2026-09-10',
    payments: [{ id: 'p4', transaction_id: 't4', payment_method: 'Credit Card', amount: 45 }],
  }),
  transaction({
    id: 't5',
    description: 'Dinner out',
    amount: 62.3,
    category_id: CATEGORY_FOOD.id,
    category: CATEGORY_FOOD,
    date: '2026-09-18',
    last_installment_date: '2026-09-18',
    payments: [{ id: 'p5', transaction_id: 't5', payment_method: 'Cash', amount: 62.3 }],
  }),
]

export const BUDGETS = [
  { id: 'b1', user_id: MOCK_USER_ID, category_id: CATEGORY_FOOD.id, monthly_limit: 300, created_at: '2026-09-01T00:00:00Z', category: CATEGORY_FOOD },
  { id: 'b2', user_id: MOCK_USER_ID, category_id: CATEGORY_TRANSPORT.id, monthly_limit: 150, created_at: '2026-09-01T00:00:00Z', category: CATEGORY_TRANSPORT },
]

export const GOALS = [
  {
    id: 'g1',
    user_id: MOCK_USER_ID,
    name: 'Emergency Fund',
    target_amount: 50000,
    current_amount: 35000,
    target_date: '2026-12-01',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'g2',
    user_id: MOCK_USER_ID,
    name: 'New Laptop',
    target_amount: 1800,
    current_amount: 1800,
    target_date: '2026-10-01',
    created_at: '2026-02-01T00:00:00Z',
  },
]

export const PROFILE_ROW = {
  user_id: MOCK_USER_ID,
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone: null,
  nationality: null,
  date_of_birth: null,
  avatar_url: null,
  theme: 'light',
  language: 'en',
  currency: 'USD',
}
