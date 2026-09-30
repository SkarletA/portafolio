// A participant's part of a shared expense - see
// docs/adr/009-shared-expense-split.md. Exactly two rows exist whenever the
// owning transaction's is_shared is true: the owner and their household
// partner, amounts summing to the transaction's amount.
export interface TransactionShare {
  id: string
  transaction_id: string
  user_id: string
  amount: number
}
