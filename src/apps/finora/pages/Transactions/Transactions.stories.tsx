import { authHandlers, MOCK_USER_ID, signInMockUser } from '@storybook-mocks/supabaseAuth'
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

const PARTNER_ID = '00000000-0000-4000-8000-000000000002'

// PR5: the owner tab, once a household is active. Two accepted
// household_members rows turn it on. "Household" shows every shared expense
// (is_shared, ADR-009) regardless of who registered it - one owned by the
// caller and one owned by PARTNER_ID here, so both must appear - and never a
// non-shared row, like the caller's own "Rent" (t2) or the partner's
// "Groceries". The partner's name in the split chips comes from
// get_household_partner (ADR-008), which still has no MSW mock (see
// AppShell.stories.tsx's note), so it renders blank here.
export const WithHousehold = {
  parameters: {
    msw: {
      handlers: [
        ...authHandlers,
        restHandler('transactions', [
          ...TRANSACTIONS,
          {
            ...TRANSACTIONS[0],
            id: 't-partner-shared',
            user_id: PARTNER_ID,
            description: 'Electricity (shared)',
            amount: 60,
            is_shared: true,
            shares: [
              { id: 's-partner-1', transaction_id: 't-partner-shared', user_id: MOCK_USER_ID, amount: 30 },
              { id: 's-partner-2', transaction_id: 't-partner-shared', user_id: PARTNER_ID, amount: 30 },
            ],
          },
          {
            ...TRANSACTIONS[0],
            id: 't-mine-shared',
            description: 'Internet (shared)',
            amount: 40,
            is_shared: true,
            shares: [
              { id: 's-mine-1', transaction_id: 't-mine-shared', user_id: MOCK_USER_ID, amount: 20 },
              { id: 's-mine-2', transaction_id: 't-mine-shared', user_id: PARTNER_ID, amount: 20 },
            ],
          },
          { ...TRANSACTIONS[0], id: 't-partner-personal', user_id: PARTNER_ID, description: 'Groceries', amount: 60 },
        ]),
        restHandler('categories', CATEGORIES),
        restHandler('household_members', [
          { id: 'm1', household_id: 'h1', user_id: MOCK_USER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
          { id: 'm2', household_id: 'h1', user_id: PARTNER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
        ]),
      ],
    },
  },
}
