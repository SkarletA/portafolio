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
  parameters: {
    docs: {
      description: {
        component: "A single navigation link, highlighted when its route is the current page.",
      },
    },
  },
  argTypes: {
    label: {
      description: 'Link text.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    icon: {
      description: 'Icon shown next to the label.',
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
    to: {
      description: 'Route to link to; omitted renders a disabled, non-interactive item.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    variant: {
      description: 'The desktop side nav (`sidebar`) or the mobile tab bar (`bottom`).',
      control: 'select',
      options: ['sidebar', 'bottom'],
      table: { type: { summary: 'string' }, defaultValue: { summary: 'sidebar' } },
    },
  },
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
