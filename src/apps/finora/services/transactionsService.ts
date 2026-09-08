import { supabase } from './supabaseClient'
import type { Transaction, TransactionType } from '../domain/transaction'
import type { Category } from '../domain/category'

export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
}

export async function getTransactions() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('transactions')
    .select('*, category:categories(id, name, icon, color)')
    .eq('user_id', userData.user.id)
    .order('date', { ascending: false })
}

export interface NewTransactionInput {
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  payment_method: string | null
  date: string
  notes: string | null
}

export async function createTransaction(data: NewTransactionInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('transactions')
    .insert({ ...data, user_id: userData.user.id })
    .select()
    .single()
}

export function deleteTransaction(id: string) {
  return supabase.from('transactions').delete().eq('id', id)
}
