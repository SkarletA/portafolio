import { useCallback, useEffect, useRef, useState } from 'react'
import { getGoals } from '../services/goalsService'
import { getGoalProgress, type Goal, type GoalProgress } from '../domain/goal'

export type GoalWithProgress = Goal & GoalProgress

export function useGoals() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getGoals()

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setGoals([])
    } else {
      const goalsWithProgress = ((data ?? []) as Goal[]).map((goal) => ({
        ...goal,
        ...getGoalProgress(goal.current_amount, goal.target_amount),
      }))
      setGoals(goalsWithProgress)
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

  return { goals, loading, error, refetch }
}
