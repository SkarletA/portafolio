import { supabase } from './supabaseClient'
import type { Budget } from '@domain/budget'
import type { Category } from '@domain/category'

export type BudgetWithCategory = Budget & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'translationKey'> | null
}

// householdMemberIds: when given (both members accepted - see
// docs/adr/007-household-foundations.md), also includes the partner's
// *household* budgets. Unlike getTransactions (PR5), RLS alone would also
// return the partner's personal budgets ("Users read household budgets" has
// no is_household filter - see household_foundations.sql), so the client
// filters it out: only my own budgets plus the partner's is_household ones,
// never the partner's personal budgets. See
// docs/adr/010-household-expense-tag-and-household-budget.md.
export async function getBudgets(householdMemberIds?: string[]) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const myId = userData.user.id
  const partnerId = (householdMemberIds ?? []).find((id) => id !== myId)

  const query = supabase
    .from('budgets')
    .select('*, category:categories(id, name, icon, color, translationKey:translation_key)')

  return (
    partnerId
      ? query.or(`user_id.eq.${myId},and(user_id.eq.${partnerId},is_household.eq.true)`)
      : query.eq('user_id', myId)
  ).order('created_at', { ascending: false })
}

export interface NewBudgetInput {
  category_id: string
  monthly_limit: number
  /** See docs/adr/010-household-expense-tag-and-household-budget.md. */
  is_household?: boolean
}

export async function createBudget(data: NewBudgetInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('budgets')
    .insert({ ...data, user_id: userData.user.id })
    .select()
    .single()
}

export type EditableBudgetInput = NewBudgetInput

// No cross-row invariant to protect here (unlike goals/goal_transfers), so a
// direct update against the table is enough - the "Users update their own
// budgets" RLS policy (auth.uid() = user_id, household_foundations.sql)
// already rejects anyone but the owner.
export function updateBudget(id: string, data: EditableBudgetInput) {
  return supabase.from('budgets').update(data).eq('id', id).select().single()
}

// Same owner-only enforcement via the "Users delete their own budgets" RLS policy.
export function deleteBudget(id: string) {
  return supabase.from('budgets').delete().eq('id', id)
}
