import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler, restSingleHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS, BUDGETS, PROFILE_ROW } from '@storybook-mocks/fixtures'
import { Dashboard } from './Dashboard'

const DASHBOARD_HANDLERS = [
  ...authHandlers,
  restHandler('transactions', TRANSACTIONS),
  restHandler('categories', CATEGORIES),
  restHandler('budgets', BUDGETS),
  restSingleHandler('profiles', PROFILE_ROW),
]

export default {
  title: 'Finora/Pages/Dashboard',
  component: Dashboard,
  parameters: {
    docs: {
      description: {
        component:
          'The signed-in home screen: current-month overview, recent transactions, top spending categories, and a budgets preview. Data comes from useTransactions/useBudgets/useDashboardSummary/useProfile, mocked here through MSW against the storybook.invalid Supabase placeholder.',
      },
    },
    msw: { handlers: DASHBOARD_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
