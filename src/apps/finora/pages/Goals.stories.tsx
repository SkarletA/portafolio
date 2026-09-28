import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler } from '@storybook-mocks/supabaseRest'
import { GOALS } from '@storybook-mocks/fixtures'
import { Goals } from './Goals'

const GOALS_HANDLERS = [...authHandlers, restHandler('goals', GOALS)]

export default {
  title: 'Finora/Pages/Goals',
  component: Goals,
  parameters: {
    docs: {
      description: {
        component: 'Savings goals with their progress toward each target. Data comes from useGoals, mocked here through MSW.',
      },
    },
    msw: { handlers: GOALS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
