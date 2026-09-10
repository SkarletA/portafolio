import { supabase } from './supabaseClient'
import type { Budget } from '../domain/budget'
import type { Category } from '../domain/category'

export type BudgetWithCategory = Budget & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
}

export async function getBudgets() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('budgets')
    .select('*, category:categories(id, name, icon, color)')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })
}

export interface NewBudgetInput {
  category_id: string
  monthly_limit: number
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
