import { useCallback, useEffect, useState } from 'react'
import { getGoalTransfers, type GoalTransferWithTransaction } from '@services/goalsService'

interface LoadedTransfers {
  /** Which goal and reload this result belongs to, so a stale one is never shown as current. */
  key: string
  transfers: GoalTransferWithTransaction[]
  error: string | null
}

/**
 * A Goal's ledger (opening balance, deposits, withdrawals), newest first.
 * Pass null to load nothing, e.g. while the activity list is collapsed.
 */
export function useGoalTransfers(goalId: string | null) {
  const [reloadCount, setReloadCount] = useState(0)
  const [loaded, setLoaded] = useState<LoadedTransfers | null>(null)
  const requestKey = goalId ? `${goalId}:${reloadCount}` : null

  useEffect(() => {
    if (!goalId || !requestKey) return

    let active = true

    getGoalTransfers(goalId).then(({ data, error }) => {
      if (!active) return
      setLoaded({
        key: requestKey,
        transfers: error ? [] : ((data ?? []) as GoalTransferWithTransaction[]),
        error: error ? error.message : null,
      })
    })

    return () => {
      active = false
    }
  }, [goalId, requestKey])

  const refetch = useCallback(() => {
    setReloadCount((count) => count + 1)
  }, [])

  const isCurrent = loaded !== null && loaded.key === requestKey
  // While reloading, keep showing the previous list of the same goal.
  const sameGoal = loaded !== null && goalId !== null && loaded.key.startsWith(`${goalId}:`)

  return {
    transfers: sameGoal ? loaded.transfers : [],
    loading: requestKey !== null && !isCurrent,
    error: isCurrent ? loaded.error : null,
    refetch,
  }
}
