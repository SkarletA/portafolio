import { Badge } from './Badge'

export default {
  title: 'Finora/Atoms/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: { component: 'A small pill-shaped status label.' },
    },
  },
  argTypes: {
    children: {
      description: 'Badge label/content.',
      control: 'text',
      table: { type: { summary: 'ReactNode' } },
    },
    variant: {
      description: 'A positive status (`success`) or a plain informational tag (`neutral`).',
      control: 'select',
      options: ['success', 'neutral'],
      table: { type: { summary: 'string' }, defaultValue: { summary: 'neutral' } },
    },
  },
}

export const Success = {
  args: { children: 'Completed', variant: 'success' },
}

export const Neutral = {
  args: { children: 'Pending', variant: 'neutral' },
}
