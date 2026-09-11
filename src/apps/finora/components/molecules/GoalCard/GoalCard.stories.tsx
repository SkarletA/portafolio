import { GoalCard } from './GoalCard'

export default {
  title: 'Finora/Molecules/GoalCard',
  component: GoalCard,
}

export const OnTrack = {
  args: {
    goal: {
      id: '1',
      user_id: 'u1',
      name: 'Emergency Fund',
      target_amount: 50000,
      current_amount: 35000,
      target_date: '2026-12-01',
      created_at: null,
      percentage: 70,
      remaining: 15000,
    },
    onFundsAdded: () => {},
  },
}

export const Completed = {
  args: {
    goal: {
      id: '2',
      user_id: 'u1',
      name: 'New Laptop',
      target_amount: 2000,
      current_amount: 2200,
      target_date: '2026-10-01',
      created_at: null,
      percentage: 110,
      remaining: 0,
    },
    onFundsAdded: () => {},
  },
}
