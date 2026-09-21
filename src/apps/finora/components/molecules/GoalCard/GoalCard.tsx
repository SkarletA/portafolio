import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../../atoms/Icon/Icon'
import { Button } from '../../atoms/Button/Button'
import { addFundsToGoal } from '@services/goalsService'
import type { GoalWithProgress } from '@hooks/useGoals'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '../../../context/CurrencyContext'
import { useLanguage } from '../../../context/LanguageContext'
import s from './GoalCard.module.css'

interface GoalCardProps {
  goal: GoalWithProgress
  onFundsAdded: () => void
}

const targetDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function GoalCard({ goal, onFundsAdded }: GoalCardProps) {
  const { t } = useTranslation(['goals', 'common'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const [isAddingFunds, setIsAddingFunds] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const cappedPercentage = Math.min(Math.max(goal.percentage, 0), 100)

  const handleAddFundsClick = useCallback(() => {
    setIsAddingFunds(true)
  }, [])

  const handleCancelClick = useCallback(() => {
    setIsAddingFunds(false)
    setAmount('')
    setError(null)
  }, [])

  const handleAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value)
    setError(null)
  }, [])

  const handleConfirmSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedAmount = Number(amount)

      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setError(t('common:validation.amountGreaterThanZero'))
        return
      }

      setSubmitting(true)

      const { error: submitError } = await addFundsToGoal(goal.id, parsedAmount)

      setSubmitting(false)

      if (submitError) {
        setError(submitError.message)
        return
      }

      setIsAddingFunds(false)
      setAmount('')
      onFundsAdded()
    },
    [amount, goal.id, onFundsAdded, t]
  )

  return (
    <div className={s.card} data-testid={`goal-card-${goal.id}`}>
      <div className={s.top}>
        <div className={s.icon}>
          <Icon name="goals" className={s.goalIcon} />
        </div>
        <div>
          <p className={s.name}>{goal.name}</p>
          {goal.target_date && (
            <p className={s.targetDate}>
              {t('goals:card.targetDate', { date: targetDateFormatter.format(new Date(goal.target_date)) })}
            </p>
          )}
        </div>
      </div>

      <div className={s.amounts}>
        <span className={s.current}>
          {formatCurrency(goal.current_amount, currency, locale, { maximumFractionDigits: 0 })}
        </span>
        <span className={s.of}>
          / {formatCurrency(goal.target_amount, currency, locale, { maximumFractionDigits: 0 })}
        </span>
      </div>

      <div
        className={s.progressTrack}
        role="progressbar"
        aria-valuenow={cappedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('goals:card.progressAriaLabel', { name: goal.name })}
      >
        <div className={s.progressFill} style={{ width: `${cappedPercentage}%` }} />
      </div>

      <div className={s.footer}>
        <span className={s.remaining}>
          {t('goals:card.remaining', {
            amount: formatCurrency(goal.remaining, currency, locale, { maximumFractionDigits: 0 }),
          })}
        </span>
        <span className={s.percentageBadge}>{Math.round(goal.percentage)}%</span>
      </div>

      {!isAddingFunds && (
        <Button
          id={`goal-card-${goal.id}-add-funds-button`}
          data-testid={`goal-card-${goal.id}-add-funds-button`}
          variant="secondary"
          className={s.addFundsButton}
          onClick={handleAddFundsClick}
        >
          {t('goals:card.addFunds')}
        </Button>
      )}

      {isAddingFunds && (
        <form onSubmit={handleConfirmSubmit} className={s.addFundsForm} noValidate>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={t('goals:card.amountPlaceholder')}
            value={amount}
            onChange={handleAmountChange}
            className={s.addFundsInput}
            aria-label={t('goals:card.amountAriaLabel', { name: goal.name })}
            aria-invalid={!!error}
            data-testid={`goal-card-${goal.id}-amount-input`}
          />
          <div className={s.addFundsActions}>
            <Button
              id={`goal-card-${goal.id}-confirm-button`}
              data-testid={`goal-card-${goal.id}-confirm-button`}
              type="submit"
              className={s.actionButton}
              disabled={submitting}
            >
              {submitting ? t('common:buttons.adding') : t('common:buttons.confirm')}
            </Button>
            <Button
              id={`goal-card-${goal.id}-cancel-button`}
              data-testid={`goal-card-${goal.id}-cancel-button`}
              type="button"
              variant="secondary"
              className={s.actionButton}
              onClick={handleCancelClick}
              disabled={submitting}
            >
              {t('common:buttons.cancel')}
            </Button>
          </div>
          {error && (
            <p role="alert" className={s.error}>
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
