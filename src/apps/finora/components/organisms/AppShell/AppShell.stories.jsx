import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

export default {
  title: 'Finora/Organisms/AppShell',
  component: AppShell,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Default = {
  args: {
    children: <p className="px-6 py-10">Page content</p>,
  },
}
