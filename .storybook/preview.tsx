import type { ReactElement } from 'react'
import type { Preview } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@context/AuthContext'
import { ThemeProvider } from '@context/ThemeContext'
import { LanguageProvider } from '@context/LanguageContext'
import { CurrencyProvider } from '@context/CurrencyContext'
import '../src/apps/finora/styles/theme.css'

const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      storySort: {
        order: ['Finora', ['Introduction', 'Atoms', 'Molecules', 'Organisms']],
      },
    },
  },
  decorators: [
    // Global so every story can freely use useAuth/useTheme/useLanguage/useCurrency
    // or <Link>/<NavLink> without repeating this per story. Uses the app's real
    // providers, not mocks - with no signed-in user (the norm in Storybook) they
    // resolve to a harmless logged-out state instead of touching Supabase, the
    // same way the app itself behaves when nobody is logged in yet.
    (Story: () => ReactElement) => (
      <MemoryRouter initialEntries={['/finora']}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <CurrencyProvider>
                <Story />
              </CurrencyProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
}

export default preview
