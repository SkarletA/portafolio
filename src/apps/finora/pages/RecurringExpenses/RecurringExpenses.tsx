import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRecurringExpenses } from '@hooks/useRecurringExpenses'
import { RecurringExpenseCard } from '@molecules/RecurringExpenseCard/RecurringExpenseCard'
import { AsyncState } from '@molecules/AsyncState/AsyncState'
import { Button } from '@atoms/Button/Button'
import { getTodayLocalDate } from '@domain/date'
import s from './RecurringExpenses.module.css'

export function RecurringExpenses() {
  const { t } = useTranslation('recurring')
  const { recurringExpenses, loading, error, refetch } = useRecurringExpenses()
  const navigate = useNavigate()
  const today = getTodayLocalDate()

  const handleNewRecurringExpenseClick = useCallback(() => {
    navigate('/finora/add-recurring-expense')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('title')}</h1>
          <p className={s.subtitle}>{t('subtitle')}</p>
        </div>
        <Button
          id="recurring-new-button"
          data-testid="recurring-new-button"
          onClick={handleNewRecurringExpenseClick}
        >
          {t('newRecurringExpense')}
        </Button>
      </div>

      <AsyncState
        loading={loading}
        error={error}
        isEmpty={recurringExpenses.length === 0}
        loadingLabel={t('list.loading')}
        errorMessage={t('list.error')}
        emptyMessage={t('list.empty')}
        skeletonCount={3}
        skeletonWrapClassName={s.skeletonWrap}
        skeletonItemClassName={s.skeletonCard}
        boxed
      >
        <div className={s.grid}>
          {recurringExpenses.map((recurringExpense) => (
            <RecurringExpenseCard
              key={recurringExpense.id}
              recurringExpense={recurringExpense}
              today={today}
              onChanged={refetch}
            />
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
