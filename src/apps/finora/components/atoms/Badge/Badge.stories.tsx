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
      description:
        'A positive status (`success`), a plain informational tag (`neutral`), or a household expense split\'s per-person amount (`shared`, docs/adr/009-shared-expense-split.md).',
      control: 'select',
      options: ['success', 'neutral', 'shared'],
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

export const Shared = {
  args: { children: 'You $600.00', variant: 'shared' },
}
