import { useCallback, useEffect, useState } from 'react'
import { getTransactions, type TransactionWithCategory } from '../services/transactionsService'

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getTransactions()

    if (fetchError) {
      setError(fetchError.message)
      setTransactions([])
    } else {
      setTransactions((data ?? []) as TransactionWithCategory[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { transactions, loading, error, refetch }
}
