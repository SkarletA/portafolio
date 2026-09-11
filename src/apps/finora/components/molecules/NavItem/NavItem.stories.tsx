import { MemoryRouter } from 'react-router-dom'
import { NavItem } from './NavItem'

const SampleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
    <circle cx="12" cy="12" r="9" />
  </svg>
)

export default {
  title: 'Finora/Molecules/NavItem',
  component: NavItem,
  decorators: [
    (Story: () => React.ReactElement) => (
      <MemoryRouter initialEntries={['/finora/transactions']}>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export const Active = {
  args: { label: 'Transactions', icon: <SampleIcon />, to: '/finora/transactions' },
}

export const Disabled = {
  args: { label: 'Budgets', icon: <SampleIcon /> },
}
