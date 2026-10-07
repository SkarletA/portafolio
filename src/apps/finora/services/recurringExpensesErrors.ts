// The stable error codes raised by create_recurring_expense,
// update_recurring_expense, cancel_recurring_expense and
// post_my_recurring_expenses - see
// supabase/migrations/20261006140000_recurring_posting.sql,
// supabase/migrations/20261008100000_recurring_shared_split_rpc.sql,
// docs/adr/012-recurring-expenses.md and docs/adr/014-recurring-shared-expenses.md.
// Callers map them to their own messages, the same pattern as householdErrors.ts.
const CODES = [
  'not_authenticated',
  'invalid_date',
  'invalid_description',
  'invalid_amount',
  'invalid_payment_method',
  'invalid_category',
  'invalid_day_of_month',
  'recurring_not_found',
  'recurring_ended',
  'effective_date_not_future',
  'recurring_term_conflict',
  'recurring_already_cancelled',
  'ended_before_today',
  'invalid_share_amount',
  'household_required_for_shared_expense',
] as const

export type RecurringExpenseErrorCode = (typeof CODES)[number]

const KNOWN_CODES = new Set<string>(CODES)

// Raised with `raise exception using errcode = 'P0001'`.
const RAISED_EXCEPTION = 'P0001'

/** Recognizes one of the codes above in a Supabase error; null for any other error. */
export function parseRecurringExpenseError(
  error: { code?: string; message?: string } | null
): RecurringExpenseErrorCode | null {
  if (!error || error.code !== RAISED_EXCEPTION || !error.message || !KNOWN_CODES.has(error.message)) return null
  return error.message as RecurringExpenseErrorCode
}
