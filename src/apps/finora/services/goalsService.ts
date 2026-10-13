import { supabase } from './supabaseClient'
import { summarizeGoalDeletionImpact } from '@domain/goal'
import type { GoalDeletionImpact, GoalTransfer, GoalTransferKind } from '@domain/goal'

export async function getGoals() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('goals')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('target_date', { ascending: true })
}

export interface EditableGoalInput {
  name: string
  target_amount: number
  target_date: string | null
}

export interface NewGoalInput extends EditableGoalInput {
  /** Money already saved before tracking it in Finora; recorded as the Goal's opening balance. */
  opening_balance: number
}

// Creates the Goal and its opening balance together, in one database
// transaction. See docs/adr/004-goal-transfers.md.
export function createGoal(data: NewGoalInput, today: string) {
  return supabase.rpc('create_goal', {
    p_name: data.name,
    p_target_amount: data.target_amount,
    p_target_date: data.target_date,
    p_opening_balance: data.opening_balance,
    p_today: today,
  })
}

// Edits name, target amount and target date. current_amount is not an input on
// purpose: it is a cache of the goal_transfers ledger and only deposits and
// withdrawals change it. See docs/adr/004-goal-transfers.md.
export function updateGoal(id: string, data: EditableGoalInput) {
  return supabase.rpc('update_goal', {
    p_id: id,
    p_name: data.name,
    p_target_amount: data.target_amount,
    p_target_date: data.target_date,
  })
}

// A deposit is one ledger row; the database updates the Goal's current_amount
// in the same statement. current_amount may exceed target_amount: the real
// saved total is never clamped, only the progress bar is (getGoalProgress).
export function addGoalDeposit(goalId: string, amount: number, date: string) {
  return supabase
    .from('goal_transfers')
    .insert({ goal_id: goalId, kind: 'deposit', amount, date })
    .select()
    .single()
}

export type GoalTransferWithTransaction = GoalTransfer & {
  /** The expense a withdrawal covers, or the reimbursement a refund returns (ADR-006). */
  transaction: { id: string; description: string } | null
}

export function getGoalTransfers(goalId: string) {
  return supabase
    .from('goal_transfers')
    .select('*, transaction:transactions(id, description)')
    .eq('goal_id', goalId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
}

// Only deposits and opening balances can be deleted (RLS) - never a
// withdrawal or refund. The database rejects it with goal_balance_negative
// when that money was already used. See docs/adr/004-goal-transfers.md.
export function deleteGoalDeposit(transferId: string) {
  return supabase.from('goal_transfers').delete().eq('id', transferId)
}

// Deletes the Goal and its remaining transfers (necessarily only deposits
// and/or an opening balance) atomically. Rejected with
// goal_has_linked_expenses or goal_has_linked_recurring_templates (ADR-004)
// if anything still depends on it - callers should pre-check with
// getGoalDeletionImpact to avoid surprising the user, but the database is
// the final authority.
export function deleteGoal(id: string) {
  return supabase.rpc('delete_goal', { p_id: id })
}

// What deleting a Goal would do: the expenses/templates that block it, or
// (when nothing does) how many deposits and how much money would stop
// counting in their months' balance. See docs/adr/004-goal-transfers.md.
export async function getGoalDeletionImpact(
  goalId: string
): Promise<{ data: GoalDeletionImpact | null; error: Error | null }> {
  const [transfersResult, templatesResult] = await Promise.all([
    supabase
      .from('goal_transfers')
      .select('kind, amount, transaction:transactions(description)')
      .eq('goal_id', goalId),
    supabase.from('recurring_expense_terms').select('description').eq('savings_goal_id', goalId),
  ])

  if (transfersResult.error) return { data: null, error: transfersResult.error }
  if (templatesResult.error) return { data: null, error: templatesResult.error }

  const transferRows = (transfersResult.data ?? []) as unknown as {
    kind: GoalTransferKind
    amount: number
    transaction: { description: string } | null
  }[]
  const transfers = transferRows.map((t) => ({
    kind: t.kind,
    amount: t.amount,
    transactionDescription: t.transaction?.description ?? null,
  }))
  const templateDescriptions = (templatesResult.data ?? []).map((r) => r.description)

  return { data: summarizeGoalDeletionImpact(transfers, templateDescriptions), error: null }
}
