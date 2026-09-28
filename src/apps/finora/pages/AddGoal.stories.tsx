import { AddGoal } from './AddGoal'

export default {
  title: 'Finora/Pages/AddGoal',
  component: AddGoal,
  parameters: {
    docs: {
      description: {
        component:
          'The new-goal form (mode="create"): name, target amount and target date. Fetches nothing on mount - only the edit mode loads an existing goal via useGoals, which needs its own mocking pass.',
      },
    },
  },
}

export const Create = {
  args: { mode: 'create' },
}
