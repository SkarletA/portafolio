import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS } from '@storybook-mocks/fixtures'
import { Transactions } from './Transactions'

const TRANSACTIONS_HANDLERS = [...authHandlers, restHandler('transactions', TRANSACTIONS), restHandler('categories', CATEGORIES)]

export default {
  title: 'Finora/Pages/Transactions',
  component: Transactions,
  parameters: {
    docs: {
      description: {
        component:
          'The full transaction ledger with search and category/payment-method filters. Data comes from useTransactions + useCategories, mocked here through MSW.',
      },
    },
    msw: { handlers: TRANSACTIONS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
