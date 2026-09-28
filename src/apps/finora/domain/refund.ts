// Linking a reimbursement to the purchase it refunds - see
// docs/adr/006-reimbursement-purchase-links.md. Pure functions over plain
// arrays; the database enforces the same cap atomically in save_transaction.
// Every comparison is made in integer cents (ADR-005).

import { subtractMoney, sumMoney, toMinorUnits } from './money'
import type { TransactionType } from './transaction'

/** The most purchases offered when choosing which one a reimbursement refunds. */
export const MAX_REFUNDABLE_PURCHASES = 100

export interface RefundSummary {
  /** How many reimbursements are linked to the purchase. */
  count: number
  /** Their exact sum. */
  total: number
}

/**
 * Groups the linked reimbursements by the purchase they refund. Rows with no
 * link (standalone reimbursements, expenses, income) are ignored.
 */
export function summarizeRefundsByPurchase(
  rows: readonly { amount: number; refunds_transaction_id: string | null }[]
): Record<string, RefundSummary> {
  const amountsByPurchase: Record<string, number[]> = {}

  for (const row of rows) {
    if (row.refunds_transaction_id === null) continue
    ;(amountsByPurchase[row.refunds_transaction_id] ??= []).push(row.amount)
  }

  return Object.fromEntries(
    Object.entries(amountsByPurchase).map(([purchaseId, amounts]) => [
      purchaseId,
      { count: amounts.length, total: sumMoney(amounts) },
    ])
  )
}

/**
 * How much of a purchase can still be refunded. When editing a reimbursement
 * that is already linked to it, its stored amount is not counted as refunded,
 * because saving replaces it.
 */
export function getRefundableRemaining(purchaseAmount: number, refundedTotal: number, ownRefundAmount = 0): number {
  return subtractMoney(purchaseAmount, subtractMoney(refundedTotal, ownRefundAmount))
}

/**
 * Whether a refund amount fits in what remains, compared in cents. An amount
 * with more than 2 decimals (half-typed input) never fits instead of throwing;
 * the form reports the decimals separately.
 */
export function fitsRefundableRemaining(amount: number, remaining: number): boolean {
  try {
    return toMinorUnits(amount) <= toMinorUnits(remaining)
  } catch (error) {
    if (error instanceof RangeError) return false
    throw error
  }
}

export interface RefundablePurchaseCandidate {
  id: string
  type: TransactionType
  amount: number
  date: string
  category_id: string | null
}

export interface RefundablePurchaseOptions {
  /** The reimbursement's date; later purchases are not offered. Null while it is not chosen yet. */
  refundDate: string | null
  /** The purchase the reimbursement being edited is already linked to, if any. */
  currentPurchaseId: string | null
  /** The stored amount of the reimbursement being edited, 0 when creating one. */
  ownRefundAmount: number
}

/**
 * The purchases a reimbursement can be linked to: expenses with a category
 * (a reimbursement must have one, and takes the purchase's), with something
 * left to refund, dated on or before the reimbursement, newest first. The
 * purchase an edited reimbursement is already linked to is always offered, even
 * if that reimbursement uses up what remains of it.
 */
export function selectRefundablePurchases<Purchase extends RefundablePurchaseCandidate>(
  purchases: readonly Purchase[],
  refundsByPurchase: Record<string, RefundSummary>,
  { refundDate, currentPurchaseId, ownRefundAmount }: RefundablePurchaseOptions
): (Purchase & { remaining: number })[] {
  const eligible = purchases
    .filter((purchase) => purchase.type === 'expense' && purchase.category_id !== null)
    .map((purchase) => ({
      ...purchase,
      remaining: getRefundableRemaining(
        purchase.amount,
        refundsByPurchase[purchase.id]?.total ?? 0,
        purchase.id === currentPurchaseId ? ownRefundAmount : 0
      ),
    }))
    .filter((purchase) => {
      if (purchase.id === currentPurchaseId) return true
      return toMinorUnits(purchase.remaining) > 0 && (refundDate === null || purchase.date <= refundDate)
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  const offered = eligible.slice(0, MAX_REFUNDABLE_PURCHASES)
  const current = eligible.find((purchase) => purchase.id === currentPurchaseId)

  // An old purchase must not fall off the list while its reimbursement is edited.
  return current && !offered.includes(current) ? [...offered, current] : offered
}
