import { supabase } from './supabaseClient'

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
  current_amount: number
  target_date: string | null
}

export async function createGoal(data: NewGoalInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('goals')
    .insert({ ...data, user_id: userData.user.id })
    .select()
    .single()
}

// current_amount is intentionally allowed to exceed target_amount here: the real
// contributed total is never silently clamped. Progress is only capped visually
// (percentage/progress bar) by domain/goal.ts's getGoalProgress, same approach
// as budget overspend in domain/budget.ts.
export async function addFundsToGoal(id: string, amount: number) {
  const { data: goal, error: fetchError } = await supabase.from('goals').select('current_amount').eq('id', id).single()

  if (fetchError) return { data: null, error: fetchError }

  return supabase
    .from('goals')
    .update({ current_amount: goal.current_amount + amount })
    .eq('id', id)
    .select()
    .single()
}
