import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
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
]

export default {
  title: 'Finora/Pages/AddBudget',
  component: AddBudget,
  parameters: {
    docs: {
      description: {
        component:
          'The new-budget form: a category picker (already-budgeted categories filtered out via useCategories + useBudgets) and a monthly limit input, mocked here through MSW.',
      },
    },
    msw: { handlers: ADD_BUDGET_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
