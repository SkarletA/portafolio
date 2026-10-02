import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler, rpcHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS, BUDGETS } from '@storybook-mocks/fixtures'
import { AddBudget } from './AddBudget'

const ADD_BUDGET_HANDLERS = [
  ...authHandlers,
  restHandler('transactions', TRANSACTIONS),
  restHandler('categories', CATEGORIES),
  restHandler('budgets', BUDGETS),
  // household_members empty -> useHousehold resolves to "no household", so
  // the household-budget toggle stays disabled, same as AddTransaction.stories.tsx.
  restHandler('household_members', []),
  rpcHandler('get_household_partner', null),
]

export default {
  title: 'Finora/Pages/AddBudget',
  component: AddBudget,
  parameters: {
    docs: {
      description: {
        component:
          'The new/edit-budget form: a category picker (already-budgeted categories filtered out via useCategories + useBudgets) and a monthly limit input, mocked here through MSW. Only mode="create" is demoed here - edit mode loads an existing budget by id via useBudgets + react-router params, which needs its own routed mocking pass (same deferral as AddGoal.stories.tsx).',
      },
    },
    msw: { handlers: ADD_BUDGET_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Create = {
  args: { mode: 'create' },
}
