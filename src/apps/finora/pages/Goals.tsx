import { useGoals } from '../hooks/useGoals'
import { GoalCard } from '../components/molecules/GoalCard/GoalCard'
import { Button } from '../components/atoms/Button/Button'
import s from './Goals.module.css'

export function Goals() {
  const { goals, loading, error, refetch } = useGoals()

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Financial goals</h1>
          <p className={s.subtitle}>Track progress toward what matters</p>
        </div>
        <Button id="goals-new-button" data-testid="goals-new-button">
          New goal
        </Button>
      </div>

      {loading && (
        <div role="status" aria-live="polite" className={s.skeletonWrap}>
          <span className={s.srOnly}>Loading goals…</span>
          {[0, 1, 2].map((key) => (
            <div key={key} className={s.skeletonCard} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className={s.errorMessage}>We couldn&apos;t load your goals. Please try again later.</p>
      )}

      {!loading && !error && goals.length === 0 && (
        <p className={s.stateMessage}>You don&apos;t have any financial goals set up yet.</p>
      )}

      {!loading && !error && goals.length > 0 && (
        <div className={s.grid}>
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onFundsAdded={refetch} />
          ))}
        </div>
      )}
    </section>
  )
}
