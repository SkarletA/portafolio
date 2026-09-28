import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS, GOALS } from '@storybook-mocks/fixtures'
import { AddTransaction } from './AddTransaction'

const ADD_TRANSACTION_HANDLERS = [
  ...authHandlers,
  restHandler('transactions', TRANSACTIONS),
  restHandler('categories', CATEGORIES),
  restHandler('goals', GOALS),
]

export default {
  title: 'Finora/Pages/AddTransaction',
  component: AddTransaction,
  parameters: {
    docs: {
      description: {
        component:
          'The new-transaction form (mode="create"): category picker, savings-goal picker and refundable-purchase picker, backed by useCategories/useGoals/useRefundablePurchases, mocked here through MSW. The edit mode also loads the transaction itself via useTransaction, which needs its own story.',
      },
    },
    msw: { handlers: ADD_TRANSACTION_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Create = {
  args: { mode: 'create' },
}
