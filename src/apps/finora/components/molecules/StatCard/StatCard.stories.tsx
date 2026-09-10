import { StatCard } from './StatCard'

export default {
  title: 'Finora/Molecules/StatCard',
  component: StatCard,
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
