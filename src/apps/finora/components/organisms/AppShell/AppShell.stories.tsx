import { authHandlers, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restSingleHandler } from '@storybook-mocks/supabaseRest'
import { PROFILE_ROW } from '@storybook-mocks/fixtures'
import { AppShell } from './AppShell'

const APP_SHELL_HANDLERS = [...authHandlers, restSingleHandler('profiles', PROFILE_ROW)]

export default {
  title: 'Finora/Organisms/AppShell',
  component: AppShell,
  parameters: {
    docs: {
      description: {
        component:
          "The app-wide frame around every Finora page: desktop sidebar or mobile header/tab bar, and the page content between them. Sidebar reads useAuth/useProfile for the signed-in name and avatar, mocked here through MSW - the only state a real user ever sees.",
      },
    },
    msw: { handlers: APP_SHELL_HANDLERS },
  },
  loaders: [signInMockUser],
  argTypes: {
    children: {
      description: "The current page's content, rendered inside the shell's main content area.",
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
  },
}

export const Default = {
  args: {
    children: <p className="px-6 py-10">Page content</p>,
  },
}
