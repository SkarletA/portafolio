import { BudgetCard } from './BudgetCard'

export default {
  title: 'Finora/Molecules/BudgetCard',
  component: BudgetCard,
  parameters: {
    docs: {
      description: {
        component:
          "A category's monthly spending progress: amount spent against its limit, with a status badge and progress bar.",
      },
    },
  },
  argTypes: {
    budget: {
      description: 'The budgeted category, its spend/limit figures, and computed progress status.',
      control: false,
      table: { type: { summary: 'BudgetWithProgress' } },
    },
    flush: {
      description: "Removes outer padding, for placing this card flush against a container's own edges.",
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
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
      effectiveLimit: 400,
      coveredBySavings: 0,
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
      effectiveLimit: 200,
      coveredBySavings: 0,
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
      effectiveLimit: 150,
      coveredBySavings: 0,
      percentage: 140,
      status: 'exceeded',
      breakdown: [],
    },
  },
}

export const WithReimbursement = {
  args: {
    budget: {
      id: '4',
      user_id: 'u1',
      category_id: 'c4',
      monthly_limit: 2000,
      created_at: null,
      category: { id: 'c4', name: 'Food', icon: 'utensils', color: '#f59e0b' },
      spent: 3625,
      effectiveLimit: 4000,
      coveredBySavings: 0,
      percentage: 90.625,
      status: 'near-limit',
      breakdown: [],
    },
  },
}
