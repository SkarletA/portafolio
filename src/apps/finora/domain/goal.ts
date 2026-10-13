import { addMoney, subtractMoney, sumMoney } from './money'

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
// A `refund` returns money to the Goal a linked reimbursement's purchase was
// covered from - see docs/adr/006-reimbursement-purchase-links.md.
export type GoalTransferKind = 'opening_balance' | 'deposit' | 'withdrawal' | 'refund'

// A Goal cannot be deleted while any transfer of these kinds references it
// (ADR-004 revision): an expense currently covered by savings from it, or a
// refund that returned money to it. Shared with the server-side check in
// delete_goal so the client's pre-check and the database never diverge.
export const GOAL_TRANSFER_KINDS_BLOCKING_DELETION: readonly GoalTransferKind[] = ['withdrawal', 'refund']

export interface GoalTransfer {
  id: string
  user_id: string
  goal_id: string
  kind: GoalTransferKind
  amount: number
  date: string
  /** The expense a withdrawal covers, or the reimbursement a refund returns; null for opening balances and deposits. */
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

export interface GoalDeletionImpact {
  /** Expenses (withdrawals) or returned refunds still linked to the Goal; deletion is blocked while this is non-empty. */
  linkedExpenseDescriptions: string[]
  /** Recurring templates, in any status, naming the Goal as their savings source; deletion is blocked while this is non-empty. */
  linkedTemplateDescriptions: string[]
  /** Deposits that would stop counting in their months' balance if the Goal is deleted. */
  depositCount: number
  depositTotal: number
}

interface GoalTransferForDeletionImpact {
  kind: GoalTransferKind
  amount: number
  transactionDescription: string | null
}

/**
 * Summarizes what deleting a Goal would do, from its already-fetched
 * transfers and the recurring templates naming it (ADR-004). Deletion is
 * blocked when any expense or template is linked; otherwise it removes
 * `depositCount` deposits totaling `depositTotal` from every month that
 * counted them.
 */
export function summarizeGoalDeletionImpact(
  transfers: readonly GoalTransferForDeletionImpact[],
  templateDescriptions: readonly string[]
): GoalDeletionImpact {
  const linkedExpenseDescriptions = transfers
    .filter((t) => GOAL_TRANSFER_KINDS_BLOCKING_DELETION.includes(t.kind))
    .map((t) => t.transactionDescription)
    .filter((description): description is string => Boolean(description))

  const deposits = transfers.filter((t) => t.kind === 'deposit')

  return {
    linkedExpenseDescriptions,
    linkedTemplateDescriptions: Array.from(new Set(templateDescriptions)),
    depositCount: deposits.length,
    depositTotal: sumMoney(deposits.map((t) => t.amount)),
  }
}
