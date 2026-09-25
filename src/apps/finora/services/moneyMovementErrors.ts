// The stable error codes raised by the save_transaction / create_goal
// functions and the Goal balance constraint - see
// supabase/migrations/20260923120000_goal_transfers.sql and
// docs/adr/004-goal-transfers.md. Callers map them to their own messages.
export type MoneyMovementErrorCode =
  | 'not_authenticated'
  | 'invalid_amount'
  | 'invalid_payment_plan'
  | 'payments_do_not_match_amount'
  | 'transaction_not_found'
  | 'goal_not_found'
  | 'insufficient_goal_funds'
  | 'goal_balance_negative'

const CODES = new Set<string>([
  'not_authenticated',
  'invalid_amount',
  'invalid_payment_plan',
  'payments_do_not_match_amount',
  'transaction_not_found',
  'goal_not_found',
  'insufficient_goal_funds',
  'goal_balance_negative',
])

// Raised with `raise exception using errcode = 'P0001'`.
const RAISED_EXCEPTION = 'P0001'

export interface MoneyMovementError {
  code: MoneyMovementErrorCode
  /** For insufficient_goal_funds: the Goal's balance when the save was attempted. */
  available: number | null
}

/** Recognizes one of the codes above in a Supabase error; null for any other error. */
export function parseMoneyMovementError(
  error: { code?: string; message?: string; details?: string | null } | null
): MoneyMovementError | null {
  if (!error || error.code !== RAISED_EXCEPTION || !error.message || !CODES.has(error.message)) return null

  const available = error.details ? Number(error.details) : NaN

  return {
    code: error.message as MoneyMovementErrorCode,
    available: Number.isFinite(available) ? available : null,
  }
}
