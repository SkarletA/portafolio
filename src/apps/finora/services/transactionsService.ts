import { supabase } from './supabaseClient'
import type { Transaction, TransactionType } from '../domain/transaction'
import type { Category } from '../domain/category'
import { getNetSpendByCategory } from '../domain/category'
import { getCategories } from './categoriesService'

export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color'> | null
}

const TRANSACTION_SELECT =
  '*, category:categories(id, name, icon, color), payments:transaction_payments(id, transaction_id, payment_method, amount)'

export async function getTransactions() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('user_id', userData.user.id)
    .order('date', { ascending: false })
}

export async function getTransactionById(id: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', id)
    .eq('user_id', userData.user.id)
    .single()
}

export interface TransactionPaymentInput {
  payment_method: string
  amount: number
}

export interface NewTransactionInput {
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  date: string
  notes: string | null
  payments: TransactionPaymentInput[]
}

export async function createTransaction(data: NewTransactionInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { payments, ...transactionFields } = data

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .insert({ ...transactionFields, user_id: userData.user.id })
    .select()
    .single()

  if (transactionError) return { data: null, error: transactionError }

  const { error: paymentsError } = await supabase.from('transaction_payments').insert(
    payments.map((payment) => ({
      ...payment,
      transaction_id: transaction.id,
      user_id: userData.user.id,
    }))
  )

  if (paymentsError) return { data: null, error: paymentsError }

  return { data: transaction, error: null }
}

export type UpdateTransactionInput = NewTransactionInput

export async function updateTransaction(id: string, data: UpdateTransactionInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { payments, ...transactionFields } = data

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .update(transactionFields)
    .eq('id', id)
    .select()
    .single()

  if (transactionError) return { data: null, error: transactionError }

  const { error: deleteError } = await supabase.from('transaction_payments').delete().eq('transaction_id', id)

  if (deleteError) return { data: null, error: deleteError }

  const { error: insertError } = await supabase.from('transaction_payments').insert(
    payments.map((payment) => ({
      ...payment,
      transaction_id: id,
      user_id: userData.user.id,
    }))
  )

  if (insertError) return { data: null, error: insertError }

  return { data: transaction, error: null }
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

  const [{ data: rows, error: rowsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
    supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('user_id', userData.user.id)
      .in('type', ['expense', 'reimbursement'])
      .gte('date', start)
      .lte('date', end),
    getCategories(),
  ])

  if (rowsError) return { data: null, error: rowsError }
  if (categoriesError) return { data: null, error: categoriesError }

  const categories = (categoriesData ?? []) as Category[]
  const totalsByCategory = getNetSpendByCategory(rows ?? [], categories)

  return { data: totalsByCategory, error: null }
}
