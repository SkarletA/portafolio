import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { createGoal, type NewGoalInput } from '@services/goalsService'
import { parseMoneyMovementError } from '@services/moneyMovementErrors'
import { getTodayLocalDate } from '@domain/date'
import { roundMoneyInput } from '@domain/money'
import s from './AddGoal.module.css'

interface FormErrors {
  name?: string
  target_amount?: string
  opening_balance?: string
}

export function AddGoal() {
  const { t } = useTranslation(['goals', 'common'])
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value)
    setErrors((prev) => (prev.name ? { ...prev, name: undefined } : prev))
  }, [])

  const handleTargetAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTargetAmount(event.target.value)
    setErrors((prev) => (prev.target_amount ? { ...prev, target_amount: undefined } : prev))
  }, [])

  const handleCurrentAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCurrentAmount(event.target.value)
    setErrors((prev) => (prev.opening_balance ? { ...prev, opening_balance: undefined } : prev))
  }, [])

  // Visible rounding to 2 decimals, so the user sees what will be saved (ADR-004).
  const handleTargetAmountBlur = useCallback(() => {
    setTargetAmount((prev) => roundMoneyInput(prev))
  }, [])

  const handleCurrentAmountBlur = useCallback(() => {
    setCurrentAmount((prev) => roundMoneyInput(prev))
  }, [])

  const handleTargetDateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTargetDate(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const trimmedName = name.trim()
      const parsedTargetAmount = Number(targetAmount)
      const parsedCurrentAmount = currentAmount ? Number(currentAmount) : 0
      const nextErrors: FormErrors = {}

      if (!trimmedName) {
        nextErrors.name = t('common:validation.nameRequired')
      }
      if (!targetAmount || Number.isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
        nextErrors.target_amount = t('goals:validation.targetAmountGreaterThanZero')
      } else if (roundMoneyInput(targetAmount) !== targetAmount) {
        nextErrors.target_amount = t('goals:validation.amountMaxDecimals')
      }
      // Already saved becomes the Goal's opening balance, which can't be negative.
      if (Number.isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
        nextErrors.opening_balance = t('goals:validation.alreadySavedNotNegative')
      } else if (roundMoneyInput(currentAmount) !== currentAmount) {
        nextErrors.opening_balance = t('goals:validation.amountMaxDecimals')
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: NewGoalInput = {
        name: trimmedName,
        target_amount: parsedTargetAmount,
        opening_balance: parsedCurrentAmount,
        target_date: targetDate || null,
      }

      const { error } = await createGoal(input, getTodayLocalDate())

      setSubmitting(false)

      if (error) {
        if (parseMoneyMovementError(error)?.code === 'invalid_amount') {
          setErrors({ opening_balance: t('goals:validation.amountMaxDecimals') })
          return
        }
        setSubmitError(error.message)
        return
      }

      navigate('/finora/goals')
    },
    [name, targetAmount, currentAmount, targetDate, navigate, t]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>{t('goals:form.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <label className={s.field}>
          {t('goals:form.name')}
          <input
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            className={s.input}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'add-goal-name-error' : undefined}
            data-testid="add-goal-name-input"
          />
          {errors.name && (
            <p id="add-goal-name-error" role="alert" className={s.error}>
              {errors.name}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('goals:form.targetAmount')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={targetAmount}
            onChange={handleTargetAmountChange}
            onBlur={handleTargetAmountBlur}
            className={s.input}
            aria-invalid={!!errors.target_amount}
            aria-describedby={errors.target_amount ? 'add-goal-target-amount-error' : undefined}
            data-testid="add-goal-target-amount-input"
          />
          {errors.target_amount && (
            <p id="add-goal-target-amount-error" role="alert" className={s.error}>
              {errors.target_amount}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('goals:form.startingAmount')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={currentAmount}
            onChange={handleCurrentAmountChange}
            onBlur={handleCurrentAmountBlur}
            className={s.input}
            aria-invalid={!!errors.opening_balance}
            aria-describedby={errors.opening_balance ? 'add-goal-current-amount-error' : undefined}
            data-testid="add-goal-current-amount-input"
          />
          {errors.opening_balance && (
            <p id="add-goal-current-amount-error" role="alert" className={s.error}>
              {errors.opening_balance}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('goals:form.targetDate')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
          <input
            type="date"
            value={targetDate}
            onChange={handleTargetDateChange}
            className={s.input}
            data-testid="add-goal-target-date-input"
          />
        </label>

        {submitError && (
          <p role="alert" className={s.error}>
            {submitError}
          </p>
        )}

        <Button id="add-goal-save-button" data-testid="add-goal-save-button" type="submit" disabled={submitting}>
          {submitting ? t('common:buttons.saving') : t('goals:form.saveGoal')}
        </Button>
      </form>
    </section>
  )
}
