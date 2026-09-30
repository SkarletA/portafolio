import { useCallback, useEffect, useRef, useState } from 'react'
import { getTransactions, type TransactionWithCategory } from '@services/transactionsService'
import { useHousehold } from '@context/HouseholdContext'

export function useTransactions() {
  const { ownMember, partnerMember } = useHousehold()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Both sides accepted (ADR-007) - a pending invitation either way shows
  // only the caller's own rows, exactly as without a household. A plain
  // string (not the array itself, recreated every render) is what actually
  // goes in refetch's dependencies below, so it stays stable across renders
  // where membership hasn't actually changed.
  const householdMemberKey =
    ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'
      ? `${ownMember.user_id},${partnerMember.user_id}`
      : ''

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getTransactions(householdMemberKey ? householdMemberKey.split(',') : undefined)

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setTransactions([])
    } else {
      setTransactions((data ?? []) as TransactionWithCategory[])
    }

    setLoading(false)
  }, [householdMemberKey])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { transactions, loading, error, refetch }
}
