import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS, BUDGETS } from '@storybook-mocks/fixtures'
import { Budgets } from './Budgets'

const BUDGETS_HANDLERS = [
  ...authHandlers,
  restHandler('transactions', TRANSACTIONS),
  restHandler('categories', CATEGORIES),
  restHandler('budgets', BUDGETS),
]

export default {
  title: 'Finora/Pages/Budgets',
  component: Budgets,
  parameters: {
    docs: {
      description: {
        component:
          "Each budgeted category's monthly progress. Data comes from useBudgets (budgets + this month's transactions + categories), mocked here through MSW.",
      },
    },
    msw: { handlers: BUDGETS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
