import { GoalCard } from './GoalCard'

export default {
  title: 'Finora/Molecules/GoalCard',
  component: GoalCard,
  parameters: {
    docs: {
      description: {
        component: "A savings goal's progress toward its target amount, with an inline form to add funds.",
      },
    },
  },
  argTypes: {
    goal: {
      description: 'The goal, its target/current amounts, and computed progress.',
      control: false,
      table: { type: { summary: 'GoalWithProgress' } },
    },
    onFundsAdded: {
      description: 'Called after funds are successfully added, so the caller can refresh the goal’s data.',
      action: 'funds added',
      table: { type: { summary: 'function' } },
    },
  },
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
