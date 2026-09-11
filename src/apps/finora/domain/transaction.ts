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
