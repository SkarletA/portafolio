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
  /** ADR-015: the full amount, tagged as the household's, no split. Mutually exclusive with is_shared. */
  is_household_expense: boolean
  /** ADR-017: the Goal this term's charge is withdrawn from. Mutually exclusive with is_shared. */
  savings_goal_id: string | null
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
  /** Legacy: set only by the retired cancel_recurring_expense (ADR-019). No RPC writes it after ADR-019; kept for one release cycle. */
  ended_on: string | null
  /** ADR-016: a planned end, by date or by charge count (display label only). */
  planned_end_on: string | null
  planned_charges: number | null
  /** ADR-019: non-null while paused, since this date. Reversible, unlike the retired ended_on. */
  deactivated_since: string | null
  /** ADR-019: the floor below which the job never posts again, set on reactivation. Never backdated. */
  active_from: string | null
  last_error: string | null
  last_error_at: string | null
  terms: RecurringExpenseTermRow[]
  occurrences: RecurringExpenseOccurrenceRow[]
}

const RECURRING_EXPENSE_SELECT =
  '*, terms:recurring_expense_terms(id, recurring_expense_id, effective_from, description, amount, category_id, payment_method, is_shared, owner_share_amount, is_household_expense, savings_goal_id, category:categories(id, name, icon, color, translationKey:translation_key)), occurrences:recurring_occurrences(id, scheduled_date, transaction_id, posted_without_household)'

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

export interface HouseholdLinkedRecurringExpenseRow {
  id: string
  ended_on: string | null
  terms: Pick<RecurringExpenseTermRow, 'effective_from' | 'description' | 'is_shared' | 'is_household_expense'>[]
}

// ADR-018: templates that are still active and shared or household-tagged -
// the caller's own, or their accepted partner's - before leaving a
// household. No owner filter, unlike getRecurringExpenses above (which
// deliberately limits to the caller's own templates, ADR-012 decision 10):
// this relies on the same household select policy (ADR-007) to read the
// partner's templates too. Informative only; the no-partner fallback
// (ADR-014/015) already protects the money without this. ADR-019: also
// excludes a deactivated template - it poses no near-term risk, since it
// won't post again until reactivated.
export function getActiveHouseholdLinkedRecurringExpenses() {
  return supabase
    .from('recurring_expenses')
    .select('id, ended_on, terms:recurring_expense_terms(effective_from, description, is_shared, is_household_expense)')
    .is('ended_on', null)
    .is('deactivated_since', null)
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
  /** ADR-015: the full amount, tagged as the household's, no split. Mutually exclusive with is_shared. */
  is_household_expense: boolean
  /** ADR-017: the Goal this term's charge is withdrawn from. Mutually exclusive with is_shared. */
  savings_goal_id: string | null
}

// ADR-016: a planned end set at creation time. planned_charges is a display
// label only - the client (getNthScheduledDate) is what translates a charge
// count into planned_end_on; the server never derives one from the other.
export interface RecurringExpensePlannedEndInput {
  planned_end_on: string | null
  planned_charges: number | null
}

// day_of_month and start_on are not inputs here: start_on is p_today + 1
// (nothing is backfilled) and day_of_month is fixed for the template's life
// (ADR-012, decisions 5 and 6).
export function createRecurringExpense(
  input: RecurringExpenseInput,
  dayOfMonth: number,
  today: string,
  plannedEnd?: RecurringExpensePlannedEndInput
) {
  return supabase.rpc('create_recurring_expense', {
    p_description: input.description,
    p_amount: input.amount,
    p_category_id: input.category_id,
    p_payment_method: input.payment_method,
    p_day_of_month: dayOfMonth,
    p_today: today,
    p_is_shared: input.is_shared,
    p_owner_share_amount: input.owner_share_amount ?? undefined,
    p_is_household_expense: input.is_household_expense,
    p_savings_goal_id: input.savings_goal_id ?? undefined,
    p_planned_end_on: plannedEnd?.planned_end_on ?? undefined,
    p_planned_charges: plannedEnd?.planned_charges ?? undefined,
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
    p_is_household_expense: input.is_household_expense,
    p_savings_goal_id: input.savings_goal_id ?? undefined,
  })
}

// ADR-019: reversible pause, replacing the old cancel_recurring_expense.
// Idempotent - a repeat call while already deactivated is a no-op, not an
// error. Flushes the owner's own dates before today first, so a genuinely
// overdue charge is never lost to the pause.
export function deactivateRecurringExpense(id: string, today: string) {
  return supabase.rpc('deactivate_recurring_expense', { p_id: id, p_today: today })
}

// ADR-019: idempotent - a repeat call while already active is a no-op.
// Never backfills: the next charge is the first scheduled date after today,
// regardless of how long the template was paused.
export function activateRecurringExpense(id: string, today: string) {
  return supabase.rpc('activate_recurring_expense', { p_id: id, p_today: today })
}

// ADR-019: deletes the template, its terms and its occurrences. Charges it
// already posted are kept as ordinary transactions; only the "Recurring"
// mark on them is lost, since that mark is read from the occurrence row.
export function deleteRecurringExpense(id: string) {
  return supabase.rpc('delete_recurring_expense', { p_id: id })
}

// ADR-016: sets or clears a planned end, independent of update_recurring_expense
// (a planned end is not a financial term). Passing both as null removes it.
export function setRecurringExpensePlannedEnd(
  id: string,
  plannedEnd: RecurringExpensePlannedEndInput,
  today: string
) {
  return supabase.rpc('set_recurring_expense_planned_end', {
    p_id: id,
    p_planned_end_on: plannedEnd.planned_end_on ?? undefined,
    p_planned_charges: plannedEnd.planned_charges ?? undefined,
    p_today: today,
  })
}

// Publishes the caller's own overdue charges now, instead of waiting for the
// hourly cron - the mitigation for the unverified pg_cron-resumes-after-a-pause
// assumption (ADR-012, decision 1). Returns the number of transactions posted.
export function postMyRecurringExpenses(today: string) {
  return supabase.rpc('post_my_recurring_expenses', { p_today: today })
}
