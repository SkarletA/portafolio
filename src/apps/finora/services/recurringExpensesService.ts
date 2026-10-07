import { supabase } from './supabaseClient'
import type { Category } from '@domain/category'

export interface RecurringExpenseTermRow {
  id: string
  recurring_expense_id: string
  effective_from: string
  description: string
  amount: number
  category_id: string | null
  payment_method: string
  category: Pick<Category, 'id' | 'name' | 'icon' | 'color' | 'translationKey'> | null
  /** ADR-014: whether this term's charge is split with a household partner. */
  is_shared: boolean
  /** The owner's own part; present if and only if is_shared. */
  owner_share_amount: number | null
}

export interface RecurringExpenseOccurrenceRow {
  id: string
  scheduled_date: string
  /** null until the posting job (or "post now") writes the transaction. */
  transaction_id: string | null
  /** ADR-014: set when a shared term's charge posted without a household partner. */
  posted_without_household: boolean
}

export interface RecurringExpenseWithDetails {
  id: string
  user_id: string
  day_of_month: number
  start_on: string
  ended_on: string | null
  last_error: string | null
  last_error_at: string | null
  terms: RecurringExpenseTermRow[]
  occurrences: RecurringExpenseOccurrenceRow[]
}

const RECURRING_EXPENSE_SELECT =
  '*, terms:recurring_expense_terms(id, recurring_expense_id, effective_from, description, amount, category_id, payment_method, is_shared, owner_share_amount, category:categories(id, name, icon, color, translationKey:translation_key)), occurrences:recurring_occurrences(id, scheduled_date, transaction_id, posted_without_household)'

// Only the caller's own templates (ADR-012, decision 10: the v1 UI shows no
// one else's, even though the household can read them through RLS).
export async function getRecurringExpenses() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase
    .from('recurring_expenses')
    .select(RECURRING_EXPENSE_SELECT)
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: true })
}

export interface RecurringExpenseInput {
  description: string
  amount: number
  category_id: string
  payment_method: string
  /** ADR-014: whether this term's charge is split with a household partner. */
  is_shared: boolean
  /** The owner's own part; present if and only if is_shared. */
  owner_share_amount: number | null
}

// day_of_month and start_on are not inputs here: start_on is p_today + 1
// (nothing is backfilled) and day_of_month is fixed for the template's life
// (ADR-012, decisions 5 and 6).
export function createRecurringExpense(input: RecurringExpenseInput, dayOfMonth: number, today: string) {
  return supabase.rpc('create_recurring_expense', {
    p_description: input.description,
    p_amount: input.amount,
    p_category_id: input.category_id,
    p_payment_method: input.payment_method,
    p_day_of_month: dayOfMonth,
    p_today: today,
    p_is_shared: input.is_shared,
    p_owner_share_amount: input.owner_share_amount ?? undefined,
  })
}

// Adds a term version starting on effectiveFrom, which must be after today.
// Charges already due keep their earlier terms (ADR-012, decision 5).
export function updateRecurringExpense(
  id: string,
  effectiveFrom: string,
  input: RecurringExpenseInput,
  today: string
) {
  return supabase.rpc('update_recurring_expense', {
    p_id: id,
    p_effective_from: effectiveFrom,
    p_description: input.description,
    p_amount: input.amount,
    p_category_id: input.category_id,
    p_payment_method: input.payment_method,
    p_today: today,
    p_is_shared: input.is_shared,
    p_owner_share_amount: input.owner_share_amount ?? undefined,
  })
}

// Charges already due up to endedOn still post later; nothing after it does
// (ADR-012, decision 7). No reactivation in v1.
export function cancelRecurringExpense(id: string, endedOn: string, today: string) {
  return supabase.rpc('cancel_recurring_expense', { p_id: id, p_ended_on: endedOn, p_today: today })
}

// Publishes the caller's own overdue charges now, instead of waiting for the
// hourly cron - the mitigation for the unverified pg_cron-resumes-after-a-pause
// assumption (ADR-012, decision 1). Returns the number of transactions posted.
export function postMyRecurringExpenses(today: string) {
  return supabase.rpc('post_my_recurring_expenses', { p_today: today })
}
