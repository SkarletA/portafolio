import { supabase } from './supabaseClient'
import type { FundingSource, Transaction, TransactionType } from '@domain/transaction'
import type { Category } from '@domain/category'
import {
  getGrossSpendByCategory,
  getRawGrossSpendByCategory,
  getReimbursementsByCategory,
  getSavingsCoveredByCategory,
} from '@domain/category'
import { expandLedgerRowsInRange } from '@domain/installments'
import { getCategories } from './categoriesService'

export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'translationKey'> | null
}

const TRANSACTION_SELECT =
  '*, category:categories(id, name, icon, color, translationKey:translation_key), payments:transaction_payments(id, transaction_id, payment_method, amount)'

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
  installment_months: number
  funding_source: FundingSource
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

export async function getExpensesByCategory({ start, end }: { start: string; end: string }) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const [{ data: rows, error: rowsError }, { data: categoriesData, error: categoriesError }] = await Promise.all([
    supabase
      .from('transactions')
      .select('category_id, amount, type, date, installment_months, funding_source')
      .eq('user_id', userData.user.id)
      .in('type', ['expense', 'reimbursement'])
      // A financed purchase dated before the range can still have an
      // installment inside it; for single payments last_installment_date is
      // the date itself, so this is the plain date filter. See
      // docs/adr/003-installments-and-savings-funding.md.
      .lte('date', end)
      .gte('last_installment_date', start),
    getCategories(),
  ])

  if (rowsError) return { data: null, error: rowsError }
  if (categoriesError) return { data: null, error: categoriesError }

  const categories = (categoriesData ?? []) as Category[]
  const entries = expandLedgerRowsInRange(rows ?? [], { start, end })

  // `totals` rolls each category's subcategories into it (for showing a
  // budget's or a chart's overall total); `raw` keeps each category's own
  // gross spend separate, e.g. for a per-subcategory breakdown; `reimbursements`
  // is the same rollup applied to reimbursement amounts, used to widen a
  // budget's effective limit; `savingsCovered` is the same rollup applied to
  // expenses covered by savings, which `totals` and `raw` leave out. Same
  // source rows, computed once, no duplicated summing. See
  // docs/adr/002-gross-spend-and-effective-limit.md and
  // docs/adr/003-installments-and-savings-funding.md.
  const data = {
    totals: getGrossSpendByCategory(entries, categories),
    raw: getRawGrossSpendByCategory(entries),
    reimbursements: getReimbursementsByCategory(entries, categories),
    savingsCovered: getSavingsCoveredByCategory(entries, categories),
  }

  return { data, error: null }
}
