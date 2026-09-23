import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@atoms/Icon/Icon'
import { Button } from '@atoms/Button/Button'
import { GoalActivity } from '@molecules/GoalActivity/GoalActivity'
import { addGoalDeposit, deleteGoalDeposit } from '@services/goalsService'
import { parseMoneyMovementError } from '@services/moneyMovementErrors'
import type { GoalWithProgress } from '@hooks/useGoals'
import { useGoalTransfers } from '@hooks/useGoalTransfers'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { getTodayLocalDate } from '@domain/date'
import { roundMoneyInput } from '@domain/money'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import s from './GoalCard.module.css'

interface GoalCardProps {
  goal: GoalWithProgress
  /** Called after a deposit is added or deleted, so the caller can refresh the goal's balance. */
  onBalanceChanged: () => void
}

const targetDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * A savings goal's progress toward its target amount, with an inline form to
 * add funds and a collapsible list of the money that moved in and out of it.
 */
export function GoalCard({ goal, onBalanceChanged }: GoalCardProps) {
  const { t } = useTranslation(['goals', 'common'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const [isAddingFunds, setIsAddingFunds] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const {
    transfers,
    loading: transfersLoading,
    error: transfersError,
    refetch: refetchTransfers,
  } = useGoalTransfers(isActivityOpen ? goal.id : null)
  const activityId = `goal-card-${goal.id}-activity`

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

  // Visible rounding to 2 decimals, so the user sees what will be saved (ADR-004).
  const handleAmountBlur = useCallback(() => {
    setAmount((prev) => roundMoneyInput(prev))
  }, [])

  const handleActivityToggle = useCallback(() => {
    setIsActivityOpen((open) => !open)
    setDeleteError(null)
  }, [])

  const handleDeleteDeposit = useCallback(
    async (transferId: string) => {
      setDeletingId(transferId)
      setDeleteError(null)

      const { error: deleteDepositError } = await deleteGoalDeposit(transferId)

      setDeletingId(null)

      if (deleteDepositError) {
        const moneyError = parseMoneyMovementError(deleteDepositError)
        setDeleteError(
          moneyError?.code === 'goal_balance_negative'
            ? t('goals:activity.depositAlreadyUsed')
            : deleteDepositError.message
        )
        return
      }

      refetchTransfers()
      onBalanceChanged()
    },
    [refetchTransfers, onBalanceChanged, t]
  )

  const handleConfirmSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedAmount = Number(amount)

      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        setError(t('common:validation.amountGreaterThanZero'))
        return
      }
      // Submitted before leaving the field (e.g. with Enter); the database would reject it.
      if (roundMoneyInput(amount) !== amount) {
        setError(t('goals:validation.amountMaxDecimals'))
        return
      }

      setSubmitting(true)

      const { error: submitError } = await addGoalDeposit(goal.id, parsedAmount, getTodayLocalDate())

      setSubmitting(false)

      if (submitError) {
        setError(submitError.message)
        return
      }

      setIsAddingFunds(false)
      setAmount('')
      if (isActivityOpen) refetchTransfers()
      onBalanceChanged()
    },
    [amount, goal.id, isActivityOpen, refetchTransfers, onBalanceChanged, t]
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
            onBlur={handleAmountBlur}
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

      <button
        type="button"
        onClick={handleActivityToggle}
        aria-expanded={isActivityOpen}
        aria-controls={activityId}
        className={s.activityToggle}
        data-testid={`goal-card-${goal.id}-activity-toggle-button`}
      >
        {isActivityOpen ? t('goals:card.hideActivity') : t('goals:card.showActivity')}
      </button>

      {isActivityOpen && (
        <div id={activityId} className={s.activity}>
          <GoalActivity
            goalName={goal.name}
            transfers={transfers}
            loading={transfersLoading}
            error={transfersError}
            deletingId={deletingId}
            deleteError={deleteError}
            onDeleteDeposit={handleDeleteDeposit}
          />
        </div>
      )}
    </div>
  )
}
