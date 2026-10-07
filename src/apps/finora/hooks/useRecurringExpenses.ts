import { useCallback, useEffect, useRef, useState } from 'react'
import { getRecurringExpenses, type RecurringExpenseWithDetails } from '@services/recurringExpensesService'

export function useRecurringExpenses() {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getRecurringExpenses()

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setRecurringExpenses([])
    } else {
      setRecurringExpenses((data ?? []) as RecurringExpenseWithDetails[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { recurringExpenses, loading, error, refetch }
}
