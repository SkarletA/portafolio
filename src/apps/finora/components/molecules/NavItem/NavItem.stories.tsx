import { useEffect, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { NavItem } from './NavItem'

const SampleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-[18px] w-[18px]">
    <circle cx="12" cy="12" r="9" />
  </svg>
)

// Points the single global Router from .storybook/preview.tsx at the given
// path before rendering, so NavLink's isActive matches it. Not a local
// <MemoryRouter>: react-router forbids nesting a Router inside another, and
// preview.tsx already provides one for every story.
function withRoute(path: string) {
  return (Story: () => ReactElement) => {
    const navigate = useNavigate()
    useEffect(() => {
      navigate(path)
    }, [navigate])
    return <Story />
  }
}

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
}

export const Active = {
  args: { label: 'Transactions', icon: <SampleIcon />, to: '/finora/transactions' },
  decorators: [withRoute('/finora/transactions')],
}

export const Disabled = {
  args: { label: 'Budgets', icon: <SampleIcon /> },
}
