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

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getCurrentMonthRange() {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()

  return {
    start: toIsoDate(new Date(Date.UTC(year, month, 1))),
    end: toIsoDate(new Date(Date.UTC(year, month + 1, 0))),
    dayOfMonth: now.getUTCDate(),
  }
}

export async function getExpensesByCategoryForCurrentMonth() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { start, end } = getCurrentMonthRange()

  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('user_id', userData.user.id)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)

  if (error) return { data: null, error }

  const totalsByCategory = (data ?? []).reduce<Record<string, number>>((totals, row) => {
    if (!row.category_id) return totals

    totals[row.category_id] = (totals[row.category_id] ?? 0) + row.amount
    return totals
  }, {})

  return { data: totalsByCategory, error: null }
}
