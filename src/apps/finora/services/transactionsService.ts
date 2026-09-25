import { supabase } from './supabaseClient'
import type { Transaction, TransactionType } from '@domain/transaction'
import type { Category } from '@domain/category'
import {
  getGrossSpendByCategory,
  getRawGrossSpendByCategory,
  getReimbursementsByCategory,
  getSavingsCoveredByCategory,
} from '@domain/category'
import { expandLedgerRowsInRange } from '@domain/installments'
import { getCategories } from './categoriesService'
import { catchServiceErrors } from './catchServiceErrors'

export type TransactionWithCategory = Transaction & {
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'translationKey'> | null
}

const TRANSACTION_SELECT =
  '*, category:categories(id, name, icon, color, translationKey:translation_key), payments:transaction_payments(id, transaction_id, payment_method, amount), withdrawal:goal_transfers(goal_id, amount, goal:goals(name))'

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
  /** The Goal a savings-funded expense withdraws from; null when funded by income. */
  savings_goal_id: string | null
  payments: TransactionPaymentInput[]
}

// Creates (id null) or updates a transaction with its payments and, for a
// savings-funded expense, its Goal withdrawal - all in one database
// transaction, so none of them can be saved without the others. Errors carry
// stable codes (see parseMoneyMovementError). See docs/adr/004-goal-transfers.md.
export function saveTransaction(id: string | null, data: NewTransactionInput) {
  return supabase.rpc('save_transaction', {
    p_id: id,
    p_description: data.description,
    p_amount: data.amount,
    p_type: data.type,
    p_category_id: data.category_id,
    p_date: data.date,
    p_notes: data.notes,
    p_installment_months: data.installment_months,
    p_savings_goal_id: data.savings_goal_id,
    p_payments: data.payments,
  })
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

export function getExpensesByCategory(range: { start: string; end: string }) {
  return catchServiceErrors(() => loadExpensesByCategory(range))
}

async function loadExpensesByCategory({ start, end }: { start: string; end: string }) {
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
