import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler, restSingleHandler, rpcHandler } from '@storybook-mocks/supabaseRest'
import { PROFILE_ROW } from '@storybook-mocks/fixtures'
import { Settings } from './Settings'

// household_members empty -> useHousehold resolves to "no household" (the
// invite form) -> get_household_partner resolves to no partner either, same
// shape the real RPC returns for a user with no household.
const SETTINGS_HANDLERS = [
  ...authHandlers,
  restSingleHandler('profiles', PROFILE_ROW),
  restHandler('household_members', []),
  rpcHandler('get_household_partner', null),
]

export default {
  title: 'Finora/Pages/Settings',
  component: Settings,
  parameters: {
    docs: {
      description: {
        component:
          'Profile, preferences, household and account management. Data comes from useProfile/useHousehold, mocked here through MSW.',
      },
    },
    msw: { handlers: SETTINGS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
