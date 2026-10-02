import { authHandlers, MOCK_USER_ID, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler, rpcHandler } from '@storybook-mocks/supabaseRest'
import { BudgetCard } from './BudgetCard'

const PARTNER_ID = '00000000-0000-4000-8000-000000000002'

// Signed in (not the Storybook norm - see .storybook/preview.tsx) so
// useAuth().user.id matches each fixture's user_id below: without it, every
// card would read as not-my-own and hide edit/delete on every story, same
// reason TransactionItem.stories.tsx does this. household_members empty ->
// useHousehold resolves to "no household"; get_household_partner mocked to
// null to match (the HouseholdBudget story below overrides both to an
// accepted partner, needed for its contribution chips to show a real name).
const BUDGET_CARD_HANDLERS = [...authHandlers, restHandler('household_members', []), rpcHandler('get_household_partner', null)]

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
    msw: { handlers: BUDGET_CARD_HANDLERS },
  },
  loaders: [signInMockUser],
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
    onDeleted: {
      description: 'Called after a successful delete, so the caller can refresh its list.',
      action: 'deleted',
      table: { type: { summary: 'function' } },
    },
  },
}

export const OnTrack = {
  args: {
    budget: {
      id: '1',
      user_id: MOCK_USER_ID,
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
      user_id: MOCK_USER_ID,
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
      user_id: MOCK_USER_ID,
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
      user_id: MOCK_USER_ID,
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

export const HouseholdBudget = {
  args: {
    budget: {
      id: '6',
      user_id: MOCK_USER_ID,
      category_id: 'c6',
      monthly_limit: 1000,
      created_at: null,
      is_household: true,
      category: { id: 'c6', name: 'Rent', icon: 'home', color: '#7c3aed' },
      spent: 1000,
      effectiveLimit: 1000,
      coveredBySavings: 0,
      percentage: 100,
      status: 'exceeded',
      breakdown: [],
      householdContributions: { own: 400, partner: 600 },
    },
  },
  parameters: {
    msw: {
      handlers: [
        ...authHandlers,
        restHandler('household_members', [
          { id: 'm1', household_id: 'h1', user_id: MOCK_USER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
          { id: 'm2', household_id: 'h1', user_id: PARTNER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
        ]),
        rpcHandler('get_household_partner', { user_id: PARTNER_ID, first_name: 'Maribel', last_name: 'Prueba', avatar_url: null }),
      ],
    },
  },
}

export const WithSpendingCoveredBySavings = {
  args: {
    budget: {
      id: '5',
      user_id: MOCK_USER_ID,
      category_id: 'c5',
      monthly_limit: 3000,
      created_at: null,
      category: { id: 'c5', name: 'Travel', icon: 'plane', color: '#0ea5e9' },
      spent: 800,
      effectiveLimit: 3000,
      coveredBySavings: 1666.67,
      percentage: 26.67,
      status: 'on-track',
      breakdown: [],
    },
  },
}
