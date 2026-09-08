export type TransactionType = 'expense' | 'income'

export interface Transaction {
  id: string
  user_id: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  payment_method: string | null
  date: string
  notes: string | null
  created_at: string | null
}
