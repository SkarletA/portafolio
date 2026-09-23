import type { TransactionPayment } from './transactionPayment'

export type TransactionType = 'expense' | 'income' | 'reimbursement'

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  date: string
  notes: string | null
  created_at: string | null
  payments: TransactionPayment[]
}

export const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer', 'Grocery Vouchers']

/**
 * The method that received the largest share of a transaction, used to
 * consolidate legacy income/reimbursement rows that were split across several
 * methods into one. Ties go to the first payment recorded; `''` when there are
 * no payments.
 */
export function getPrimaryPaymentMethod(payments: Pick<TransactionPayment, 'payment_method' | 'amount'>[]): string {
  let primary: Pick<TransactionPayment, 'payment_method' | 'amount'> | null = null

  for (const payment of payments) {
    if (!primary || payment.amount > primary.amount) primary = payment
  }

  return primary?.payment_method ?? ''
}
