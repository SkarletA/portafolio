import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { createGoal, type NewGoalInput } from '../services/goalsService'
import s from './AddGoal.module.css'

interface FormErrors {
  name?: string
  target_amount?: string
}

export function AddGoal() {
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
        nextErrors.name = 'Name is required'
      }
      if (!targetAmount || Number.isNaN(parsedTargetAmount) || parsedTargetAmount <= 0) {
        nextErrors.target_amount = 'Enter a target amount greater than 0'
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: NewGoalInput = {
        name: trimmedName,
        target_amount: parsedTargetAmount,
        current_amount: Number.isNaN(parsedCurrentAmount) ? 0 : parsedCurrentAmount,
        target_date: targetDate || null,
      }

      const { error } = await createGoal(input)

      setSubmitting(false)

      if (error) {
        setSubmitError(error.message)
        return
      }

      navigate('/finora/goals')
    },
    [name, targetAmount, currentAmount, targetDate, navigate]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>New goal</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <label className={s.field}>
          Name
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
          Target amount
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={targetAmount}
            onChange={handleTargetAmountChange}
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
          Starting amount <span className={s.hint}>(optional)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={currentAmount}
            onChange={handleCurrentAmountChange}
            className={s.input}
            data-testid="add-goal-current-amount-input"
          />
        </label>

        <label className={s.field}>
          Target date <span className={s.hint}>(optional)</span>
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
          {submitting ? 'Saving…' : 'Save goal'}
        </Button>
      </form>
    </section>
  )
}
