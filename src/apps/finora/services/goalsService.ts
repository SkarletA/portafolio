import { supabase } from './supabaseClient'
import type { GoalTransfer } from '@domain/goal'

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

export interface NewGoalInput {
  name: string
  target_amount: number
  /** Money already saved before tracking it in Finora; recorded as the Goal's opening balance. */
  opening_balance: number
  target_date: string | null
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
  /** The expense a withdrawal covers. */
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

// Only deposits can be deleted (RLS). The database rejects it with
// goal_balance_negative when that money was already used by a withdrawal.
export function deleteGoalDeposit(transferId: string) {
  return supabase.from('goal_transfers').delete().eq('id', transferId).eq('kind', 'deposit')
}
