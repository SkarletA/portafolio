// The stable error codes raised by the save_transaction / create_goal
// (and update_goal) functions and the Goal balance constraint - see
// supabase/migrations/20260923120000_goal_transfers.sql,
// supabase/migrations/20260928000000_refund_links.sql,
// docs/adr/004-goal-transfers.md and
// docs/adr/006-reimbursement-purchase-links.md. Callers map them to their own messages.
const CODES = [
  'not_authenticated',
  'invalid_amount',
  'invalid_payment_plan',
  'payments_do_not_match_amount',
  'transaction_not_found',
  'goal_not_found',
  'insufficient_goal_funds',
  'goal_balance_negative',
  'invalid_refund_link',
  'refund_category_mismatch',
  'refund_before_purchase',
  'refund_exceeds_purchase',
  'purchase_has_linked_refunds',
] as const

export type MoneyMovementErrorCode = (typeof CODES)[number]

const KNOWN_CODES = new Set<string>(CODES)

// Raised with `raise exception using errcode = 'P0001'`.
const RAISED_EXCEPTION = 'P0001'

export interface MoneyMovementError {
  code: MoneyMovementErrorCode
  /**
   * The amount the code carries, when it has one. For insufficient_goal_funds:
   * the Goal's balance when the save was attempted. For refund_exceeds_purchase
   * while saving a reimbursement: what can still be refunded; while saving a
   * purchase: what is already refunded, the least its amount can be.
   */
  available: number | null
}

/** Recognizes one of the codes above in a Supabase error; null for any other error. */
export function parseMoneyMovementError(
  error: { code?: string; message?: string; details?: string | null } | null
): MoneyMovementError | null {
  if (!error || error.code !== RAISED_EXCEPTION || !error.message || !KNOWN_CODES.has(error.message)) return null

  const available = error.details ? Number(error.details) : NaN

  return {
    code: error.message as MoneyMovementErrorCode,
    available: Number.isFinite(available) ? available : null,
  }
}

// Postgres foreign key violation, sent when deleting a row that is still referenced.
const FOREIGN_KEY_VIOLATION = '23503'

// Named explicitly in the refund_links migration so it can be recognized here.
const LINKED_REFUNDS_CONSTRAINT = 'transactions_refunds_transaction_id_fkey'

/**
 * Whether a delete failed because reimbursements are still linked to the
 * purchase. Other foreign key violations are not this error.
 */
export function isLinkedRefundsViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === FOREIGN_KEY_VIOLATION && Boolean(error.message?.includes(LINKED_REFUNDS_CONSTRAINT))
}

export interface LinkedRefund {
  id: string
  description: string
  amount: number
  date: string
}

/**
 * A purchase cannot be deleted while reimbursements are linked to it. Carries
 * those reimbursements so the message can say which ones to unlink or delete
 * first. See docs/adr/006-reimbursement-purchase-links.md.
 */
export class PurchaseHasLinkedRefundsError extends Error {
  readonly refunds: LinkedRefund[]

  constructor(refunds: LinkedRefund[]) {
    super('purchase_has_linked_refunds')
    this.name = 'PurchaseHasLinkedRefundsError'
    this.refunds = refunds
  }
}
