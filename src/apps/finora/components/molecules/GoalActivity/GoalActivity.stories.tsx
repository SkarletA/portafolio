import { GoalActivity } from './GoalActivity'

export default {
  title: 'Finora/Molecules/GoalActivity',
  component: GoalActivity,
  parameters: {
    docs: {
      description: {
        component:
          "The money that moved into and out of a Goal: what was already saved, deposits (deletable) and withdrawals linked to the expense they covered.",
      },
    },
  },
  argTypes: {
    transfers: {
      description: 'The Goal ledger, newest first.',
      control: false,
      table: { type: { summary: 'GoalTransferWithTransaction[]' } },
    },
    onDeleteDeposit: {
      description: 'Called with the deposit id to delete.',
      action: 'delete deposit',
      table: { type: { summary: 'function' } },
    },
  },
}

const base = { user_id: 'u1', goal_id: 'g1', created_at: '2026-09-23T10:00:00Z' }

export const WithActivity = {
  args: {
    goalName: 'Vacation',
    loading: false,
    error: null,
    deletingId: null,
    deleteError: null,
    transfers: [
      {
        ...base,
        id: 'w1',
        kind: 'withdrawal',
        amount: 20000,
        date: '2026-09-15',
        transaction_id: 'tx1',
        transaction: { id: 'tx1', description: 'Flights to Madrid' },
      },
      { ...base, id: 'd1', kind: 'deposit', amount: 5000, date: '2026-09-01', transaction_id: null, transaction: null },
      { ...base, id: 'o1', kind: 'opening_balance', amount: 18000, date: '2026-05-10', transaction_id: null, transaction: null },
    ],
  },
}

export const DepositAlreadyUsed = {
  args: {
    ...WithActivity.args,
    deleteError: 'This deposit was already used by expenses covered by savings, so it can’t be deleted.',
  },
}

export const Empty = {
  args: { ...WithActivity.args, transfers: [] },
}
