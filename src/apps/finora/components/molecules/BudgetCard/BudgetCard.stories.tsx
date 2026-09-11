import { BudgetCard } from './BudgetCard'

export default {
  title: 'Finora/Molecules/BudgetCard',
  component: BudgetCard,
}

export const OnTrack = {
  args: {
    budget: {
      id: '1',
      user_id: 'u1',
      category_id: 'c1',
      monthly_limit: 400,
      created_at: null,
      category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#f59e0b' },
      spent: 120,
      percentage: 30,
      status: 'on-track',
      breakdown: [],
    },
  },
}

export const NearLimit = {
  args: {
    budget: {
      id: '2',
      user_id: 'u1',
      category_id: 'c2',
      monthly_limit: 200,
      created_at: null,
      category: { id: 'c2', name: 'Transport', icon: 'car', color: '#2563eb' },
      spent: 180,
      percentage: 90,
      status: 'near-limit',
      breakdown: [],
    },
  },
}

export const Exceeded = {
  args: {
    budget: {
      id: '3',
      user_id: 'u1',
      category_id: 'c3',
      monthly_limit: 150,
      created_at: null,
      category: { id: 'c3', name: 'Shopping', icon: null, color: null },
      spent: 210,
      percentage: 140,
      status: 'exceeded',
      breakdown: [],
    },
  },
}
