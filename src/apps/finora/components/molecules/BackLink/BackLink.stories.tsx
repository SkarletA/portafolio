import { BackLink } from './BackLink'

export default {
  title: 'Finora/Molecules/BackLink',
  component: BackLink,
  parameters: {
    docs: {
      description: {
        component: "A link back to a form's list screen, so leaving a form does not depend on the side navigation.",
      },
    },
  },
  argTypes: {
    to: {
      description: 'Route of the screen this one came from.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    children: {
      description: 'Where the link goes, e.g. "Back to goals".',
      control: 'text',
      table: { type: { summary: 'ReactNode' } },
    },
  },
  // No local <MemoryRouter> here: .storybook/preview.tsx already wraps every
  // story in one, and react-router forbids nesting a Router inside another.
}

export const Default = {
  args: { to: '/finora/goals', children: 'Back to goals' },
}
