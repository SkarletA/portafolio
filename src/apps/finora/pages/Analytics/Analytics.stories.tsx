import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { CATEGORIES, TRANSACTIONS } from '@storybook-mocks/fixtures'
import { Analytics } from './Analytics'

const ANALYTICS_HANDLERS = [...authHandlers, restHandler('transactions', TRANSACTIONS), restHandler('categories', CATEGORIES)]

export default {
  title: 'Finora/Pages/Analytics',
  component: Analytics,
  parameters: {
    docs: {
      description: {
        component:
          'Spending trend, category breakdown and period-over-period comparison. Data comes from useAnalytics (transactions + categories), mocked here through MSW.',
      },
    },
    msw: { handlers: ANALYTICS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
