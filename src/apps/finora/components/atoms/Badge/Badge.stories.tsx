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
        'A positive status (`success`), a plain informational tag (`neutral`), a household expense split\'s per-person amount (`shared`, docs/adr/009-shared-expense-split.md), or a single-line informational tag with no money split (`context` - TransactionItem\'s gray chips: refund-of, covered-by-savings, household Case B).',
      control: 'select',
      options: ['success', 'neutral', 'shared', 'context'],
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

export const Context = {
  args: { children: 'Refund of Shoes', variant: 'context' },
}
