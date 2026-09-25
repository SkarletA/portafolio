import { addMoney, subtractMoney } from './money'

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  created_at: string | null
}

export interface GoalProgress {
  percentage: number
  remaining: number
}

export function getGoalProgress(current: number, target: number): GoalProgress {
  if (target <= 0) {
    return { percentage: current > 0 ? 100 : 0, remaining: 0 }
  }

  return {
    percentage: (current / target) * 100,
    remaining: Math.max(subtractMoney(target, current), 0),
  }
}

// A movement of money into or out of a Goal - see
// docs/adr/004-goal-transfers.md. Amounts are positive; direction comes from
// `kind`. goals.current_amount is kept equal to the ledger by the database.
export type GoalTransferKind = 'opening_balance' | 'deposit' | 'withdrawal'

export interface GoalTransfer {
  id: string
  user_id: string
  goal_id: string
  kind: GoalTransferKind
  amount: number
  date: string
  /** The expense a withdrawal covers; null for opening balances and deposits. */
  transaction_id: string | null
  created_at: string
}

/**
 * How much of a Goal an expense can use. When editing an expense that already
 * withdraws from this Goal, that withdrawal is returned to the Goal before the
 * new one is taken, so it counts as available. Summed exactly so the figure
 * shown matches the database's arithmetic.
 */
export function getAvailableForExpense(
  goal: Pick<Goal, 'id' | 'current_amount'>,
  existingWithdrawal: { goal_id: string; amount: number } | null
): number {
  const returned = existingWithdrawal?.goal_id === goal.id ? existingWithdrawal.amount : 0
  return addMoney(goal.current_amount, returned)
}
