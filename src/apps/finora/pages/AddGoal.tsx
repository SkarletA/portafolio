import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { BackLink } from '@molecules/BackLink/BackLink'
import { createGoal, updateGoal, type EditableGoalInput, type NewGoalInput } from '@services/goalsService'
import { parseMoneyMovementError } from '@services/moneyMovementErrors'
import { useGoals } from '@hooks/useGoals'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { getTodayLocalDate } from '@domain/date'
import type { Goal } from '@domain/goal'
import { roundMoneyInput } from '@domain/money'
import s from './AddGoal.module.css'

interface FormErrors {
  name?: string
  target_amount?: string
  opening_balance?: string
}

interface AddGoalProps {
  mode: 'create' | 'edit'
}

/** Creates a Goal, or edits an existing one's name, target amount and target date. */
export function AddGoal({ mode }: AddGoalProps) {
  return mode === 'edit' ? <EditGoal /> : <GoalForm mode="create" />
}

// Loads the Goal named in the route, then hands it to the form as its initial values.
function EditGoal() {
  const { t } = useTranslation('goals')
  const { id } = useParams<{ id: string }>()
  const { goals, loading, error } = useGoals()
  const goal = goals.find((item) => item.id === id)

  if (loading) {
    return (
      <section className={s.section}>
        <p className={s.hint}>{t('form.loadingGoal')}</p>
      </section>
    )
  }

  if (error || !goal) {
    return (
      <section className={s.section}>
        <BackLink to="/finora/goals" data-testid="edit-goal-back-link">
          {t('form.backToGoals')}
        </BackLink>
        <p role="alert" className={s.error}>
          {error ? t('form.loadError') : t('form.notFound')}
        </p>
      </section>
    )
  }

  return <GoalForm mode="edit" goal={goal} />
}

interface GoalFormProps {
  mode: 'create' | 'edit'
  /** The Goal being edited; required in edit mode. */
  goal?: Goal
}

function GoalForm({ mode, goal }: GoalFormProps) {
  const { t } = useTranslation(['goals', 'common'])
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const isEdit = mode === 'edit' && !!goal
  const testIdPrefix = isEdit ? 'edit-goal' : 'add-goal'

  const [name, setName] = useState(goal?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? '')
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
      // Editing never touches it: the saved amount only moves through deposits and withdrawals.
      if (!isEdit) {
        if (Number.isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
          nextErrors.opening_balance = t('goals:validation.alreadySavedNotNegative')
        } else if (roundMoneyInput(currentAmount) !== currentAmount) {
          nextErrors.opening_balance = t('goals:validation.amountMaxDecimals')
        }
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const fields: EditableGoalInput = {
        name: trimmedName,
        target_amount: parsedTargetAmount,
        target_date: targetDate || null,
      }

      let error
      if (isEdit) {
        ;({ error } = await updateGoal(goal.id, fields))
      } else {
        const input: NewGoalInput = { ...fields, opening_balance: parsedCurrentAmount }
        ;({ error } = await createGoal(input, getTodayLocalDate()))
      }

      setSubmitting(false)

      if (error) {
        const moneyError = parseMoneyMovementError(error)
        if (moneyError?.code === 'invalid_amount') {
          setErrors(
            isEdit
              ? { target_amount: t('goals:validation.amountMaxDecimals') }
              : { opening_balance: t('goals:validation.amountMaxDecimals') }
          )
          return
        }
        setSubmitError(moneyError?.code === 'goal_not_found' ? t('goals:form.notFound') : error.message)
        return
      }

      navigate('/finora/goals')
    },
    [name, targetAmount, currentAmount, targetDate, isEdit, goal, navigate, t]
  )

  // Not an error: a target below what is already saved just means the goal is already reached.
  const parsedTarget = Number(targetAmount)
  const targetBelowSaved = isEdit && targetAmount !== '' && parsedTarget > 0 && parsedTarget < goal.current_amount

  return (
    <section className={s.section}>
      <BackLink to="/finora/goals" data-testid={`${testIdPrefix}-back-link`}>
        {t('goals:form.backToGoals')}
      </BackLink>
      <h1 className={s.title}>{isEdit ? t('goals:form.editTitle') : t('goals:form.title')}</h1>

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
            aria-describedby={errors.name ? `${testIdPrefix}-name-error` : undefined}
            data-testid={`${testIdPrefix}-name-input`}
          />
          {errors.name && (
            <p id={`${testIdPrefix}-name-error`} role="alert" className={s.error}>
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
            aria-describedby={errors.target_amount ? `${testIdPrefix}-target-amount-error` : undefined}
            data-testid={`${testIdPrefix}-target-amount-input`}
          />
          {errors.target_amount && (
            <p id={`${testIdPrefix}-target-amount-error`} role="alert" className={s.error}>
              {errors.target_amount}
            </p>
          )}
        </label>

        {targetBelowSaved && (
          <p role="status" className={s.warning} data-testid={`${testIdPrefix}-below-saved-warning`}>
            {t('goals:form.belowSavedWarning', {
              saved: formatCurrency(goal.current_amount, currency, getLocaleForLanguage(language)),
            })}
          </p>
        )}

        {!isEdit && (
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
              aria-describedby={errors.opening_balance ? `${testIdPrefix}-current-amount-error` : undefined}
              data-testid={`${testIdPrefix}-current-amount-input`}
            />
            {errors.opening_balance && (
              <p id={`${testIdPrefix}-current-amount-error`} role="alert" className={s.error}>
                {errors.opening_balance}
              </p>
            )}
          </label>
        )}

        <label className={s.field}>
          {t('goals:form.targetDate')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
          <input
            type="date"
            value={targetDate}
            onChange={handleTargetDateChange}
            className={s.input}
            data-testid={`${testIdPrefix}-target-date-input`}
          />
        </label>

        {submitError && (
          <p role="alert" className={s.error}>
            {submitError}
          </p>
        )}

        <Button
          id={`${testIdPrefix}-save-button`}
          data-testid={`${testIdPrefix}-save-button`}
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('common:buttons.saving') : isEdit ? t('goals:form.saveChanges') : t('goals:form.saveGoal')}
        </Button>
      </form>
    </section>
  )
}
