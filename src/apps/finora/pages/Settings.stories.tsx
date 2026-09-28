import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restSingleHandler } from '@storybook-mocks/supabaseRest'
import { PROFILE_ROW } from '@storybook-mocks/fixtures'
import { Settings } from './Settings'

const SETTINGS_HANDLERS = [...authHandlers, restSingleHandler('profiles', PROFILE_ROW)]

export default {
  title: 'Finora/Pages/Settings',
  component: Settings,
  parameters: {
    docs: {
      description: {
        component: 'Profile, preferences and account management. Data comes from useProfile, mocked here through MSW.',
      },
    },
    msw: { handlers: SETTINGS_HANDLERS },
  },
  loaders: [signInMockUser],
}

export const Default = {}
