import { StatCard } from './StatCard'

export default {
  title: 'Finora/Molecules/StatCard',
  component: StatCard,
  parameters: {
    docs: {
      description: {
        component: 'A single labeled figure, e.g. an amount or percentage, shown in a small card.',
      },
    },
  },
  argTypes: {
    label: {
      description: 'What the figure represents.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    value: {
      description: 'Pre-formatted display value, e.g. an already currency-formatted amount or a percentage string.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    testId: {
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    variant: {
      description: 'Colors the value green/red for a positive/negative figure; `default` is neutral.',
      control: 'select',
      options: ['default', 'success', 'danger'],
      table: { type: { summary: 'string' }, defaultValue: { summary: 'default' } },
    },
  },
}

export const Default = {
  args: {
    label: 'Total spent',
    value: '$1,240',
    testId: 'stat-card-total-spent',
  },
}

export const Success = {
  args: {
    label: 'Savings rate',
    value: '28%',
    testId: 'stat-card-savings-rate',
    variant: 'success',
  },
}

export const Danger = {
  args: {
    label: 'Savings rate',
    value: '-15%',
    testId: 'stat-card-savings-rate',
    variant: 'danger',
  },
}
