import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { AuthProvider } from '../../../context/AuthContext'

export default {
  title: 'Finora/Organisms/AppShell',
  component: AppShell,
  decorators: [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={['/finora']}>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
}

export const Default = {
  args: {
    children: <p className="px-6 py-10">Page content</p>,
  },
}
