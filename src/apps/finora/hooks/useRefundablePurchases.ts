import { useCallback, useEffect, useRef, useState } from 'react'
import { getRefundablePurchases, type RefundablePurchase } from '@services/transactionsService'
import type { RefundablePurchaseOptions } from '@domain/refund'

// The purchases a reimbursement can be linked to, kept in step with its date
// and (in edit mode) the reimbursement it already refunds - see
// docs/adr/006-reimbursement-purchase-links.md. Refetches whenever those
// change, since the eligible set and each remaining amount depend on them.
export function useRefundablePurchases({ refundDate, currentPurchaseId, ownRefundAmount }: RefundablePurchaseOptions) {
  const [purchases, setPurchases] = useState<RefundablePurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getRefundablePurchases({ refundDate, currentPurchaseId, ownRefundAmount })

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setPurchases([])
    } else {
      setPurchases(data ?? [])
    }

    setLoading(false)
  }, [refundDate, currentPurchaseId, ownRefundAmount])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { purchases, loading, error }
}
