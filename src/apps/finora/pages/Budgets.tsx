import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgets } from '../hooks/useBudgets'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import { Button } from '../components/atoms/Button/Button'
import s from './Budgets.module.css'

export function Budgets() {
  const { budgets, loading, error } = useBudgets()
  const navigate = useNavigate()

  const handleNewBudgetClick = useCallback(() => {
    navigate('/finora/add-budget')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Budgets</h1>
          <p className={s.subtitle}>Track how much you've spent against your monthly limits</p>
        </div>
        <Button id="budgets-new-button" data-testid="budgets-new-button" onClick={handleNewBudgetClick}>
          New budget
        </Button>
      </div>

      {loading && (
        <div role="status" aria-live="polite" className={s.skeletonWrap}>
          <span className={s.srOnly}>Loading budgets…</span>
          {[0, 1, 2].map((key) => (
            <div key={key} className={s.skeletonCard} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className={s.errorMessage}>We couldn&apos;t load your budgets. Please try again later.</p>
      )}

      {!loading && !error && budgets.length === 0 && (
        <p className={s.stateMessage}>You don&apos;t have any budgets set up yet.</p>
      )}

      {!loading && !error && budgets.length > 0 && (
        <div className={s.grid}>
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>
      )}
    </section>
  )
}
