import { useCallback, useEffect, useRef, useState } from 'react'
import { getTransactionById, type TransactionWithCategory } from '../services/transactionsService'

export function useTransaction(id: string | undefined) {
  const [transaction, setTransaction] = useState<TransactionWithCategory | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getTransactionById(id)

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setTransaction(null)
    } else {
      setTransaction(data as TransactionWithCategory)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    mountedRef.current = true

    if (id) refetch()

    return () => {
      mountedRef.current = false
    }
  }, [id, refetch])

  return { transaction, loading, error, refetch }
}
