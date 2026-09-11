import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBudgets } from '../hooks/useBudgets'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import { BudgetCardBreakdown } from '../components/molecules/BudgetCardBreakdown/BudgetCardBreakdown'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
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

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={budgets.length === 0}
        loadingLabel="Loading budgets…"
        errorMessage="We couldn't load your budgets. Please try again later."
        emptyMessage="You don't have any budgets set up yet."
        skeletonCount={3}
        skeletonWrapClassName={s.skeletonWrap}
        skeletonItemClassName={s.skeletonCard}
        boxed
      >
        <div className={s.grid}>
          {budgets.map((budget) => (
            <div key={budget.id} className={s.budgetGroup}>
              <BudgetCard budget={budget} flush={budget.breakdown.length > 0} />
              <BudgetCardBreakdown
                categoryId={budget.category_id}
                categoryName={budget.category?.name ?? 'Uncategorized'}
                limit={budget.effectiveLimit}
                items={budget.breakdown}
              />
            </div>
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
