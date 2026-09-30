import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS } from '@storybook-mocks/fixtures'
import { Transactions } from './Transactions'

// household_members empty -> useHousehold resolves to "no household" (see
// AppShell/Settings.stories.tsx); each row is a TransactionItem, which reads
// it too now (ADR-009's shared label).
const TRANSACTIONS_HANDLERS = [
  ...authHandlers,
  restHandler('transactions', TRANSACTIONS),
  restHandler('categories', CATEGORIES),
  restHandler('household_members', []),
]

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
