import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoals } from '../hooks/useGoals'
import { GoalCard } from '../components/molecules/GoalCard/GoalCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import { Button } from '../components/atoms/Button/Button'
import s from './Goals.module.css'

export function Goals() {
  const { goals, loading, error, refetch } = useGoals()
  const navigate = useNavigate()

  const handleNewGoalClick = useCallback(() => {
    navigate('/finora/add-goal')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Financial goals</h1>
          <p className={s.subtitle}>Track progress toward what matters</p>
        </div>
        <Button id="goals-new-button" data-testid="goals-new-button" onClick={handleNewGoalClick}>
          New goal
        </Button>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={goals.length === 0}
        loadingLabel="Loading goals…"
        errorMessage="We couldn't load your goals. Please try again later."
        emptyMessage="You don't have any financial goals set up yet."
        skeletonCount={3}
        skeletonWrapClassName={s.skeletonWrap}
        skeletonItemClassName={s.skeletonCard}
        boxed
      >
        <div className={s.grid}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onFundsAdded={refetch} />
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
