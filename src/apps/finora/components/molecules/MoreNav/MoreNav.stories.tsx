import { useEffect, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreNav } from './MoreNav'

// Points the single global Router from .storybook/preview.tsx at the given
// path before rendering, so the "active on one of its destinations" check
// matches it - see NavItem.stories.tsx's own withRoute for why this isn't a
// local <MemoryRouter> (react-router forbids nesting one Router in another).
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
  title: 'Finora/Molecules/MoreNav',
  component: MoreNav,
  parameters: {
    docs: {
      description: {
        component:
          "The mobile bottom nav's \"More\" tab: opens a bottom sheet listing Goals, Recurring and Settings - the three destinations with no tab of their own at a phone width, since a bottom bar caps out at five.",
      },
    },
  },
  decorators: [withRoute('/finora')],
}

export const Default = {}

export const ActiveOnADestination = {
  decorators: [withRoute('/finora/settings')],
  parameters: {
    docs: { description: { story: 'Marked active just from being on one of its three destinations, even with the sheet closed.' } },
  },
}
