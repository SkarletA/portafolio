import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useCategories } from '../hooks/useCategories'
import { useBudgets } from '../hooks/useBudgets'
import { createBudget, type NewBudgetInput } from '../services/budgetsService'
import s from './AddBudget.module.css'

interface FormErrors {
  category_id?: string
  monthly_limit?: string
}

export function AddBudget() {
  const navigate = useNavigate()
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const { budgets, loading: budgetsLoading } = useBudgets()

  const [categoryId, setCategoryId] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const budgetedCategoryIds = useMemo(() => new Set(budgets.map((budget) => budget.category_id)), [budgets])

  const availableCategories = useMemo(
    () => categories.filter((category) => !budgetedCategoryIds.has(category.id)),
    [categories, budgetedCategoryIds]
  )

  const loadingOptions = categoriesLoading || budgetsLoading
  const noAvailableCategories = !loadingOptions && !categoriesError && availableCategories.length === 0

  const handleCategoryChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(event.target.value)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
  }, [])

  const handleMonthlyLimitChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMonthlyLimit(event.target.value)
    setErrors((prev) => (prev.monthly_limit ? { ...prev, monthly_limit: undefined } : prev))
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedLimit = Number(monthlyLimit)
      const nextErrors: FormErrors = {}

      if (!categoryId) {
        nextErrors.category_id = 'Select a category'
      }
      if (!monthlyLimit || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        nextErrors.monthly_limit = 'Enter a limit greater than 0'
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: NewBudgetInput = {
        category_id: categoryId,
        monthly_limit: parsedLimit,
      }

      const { error } = await createBudget(input)

      setSubmitting(false)

      if (error) {
        setSubmitError(error.message)
        return
      }

      navigate('/finora/budgets')
    },
    [categoryId, monthlyLimit, navigate]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>New budget</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <label className={s.field}>
          Category
          <select
            required
            value={categoryId}
            onChange={handleCategoryChange}
            className={s.select}
            disabled={loadingOptions || noAvailableCategories}
            aria-invalid={!!errors.category_id}
            aria-describedby={errors.category_id ? 'add-budget-category-error' : undefined}
            data-testid="add-budget-category-select"
          >
            <option value="" disabled={availableCategories.length > 0}>
              {loadingOptions ? 'Loading categories…' : 'Select a category'}
            </option>
            {noAvailableCategories && (
              <option value="" disabled>
                No categories available
              </option>
            )}
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p id="add-budget-category-error" role="alert" className={s.error}>
              {errors.category_id}
            </p>
          )}
          {categoriesError && (
            <p role="alert" className={s.error}>
              Couldn&apos;t load categories: {categoriesError}
            </p>
          )}
          {noAvailableCategories && (
            <p className={s.hint}>All your categories already have a budget.</p>
          )}
        </label>

        <label className={s.field}>
          Monthly limit
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={monthlyLimit}
            onChange={handleMonthlyLimitChange}
            className={s.input}
            aria-invalid={!!errors.monthly_limit}
            aria-describedby={errors.monthly_limit ? 'add-budget-monthly-limit-error' : undefined}
            data-testid="add-budget-monthly-limit-input"
          />
          {errors.monthly_limit && (
            <p id="add-budget-monthly-limit-error" role="alert" className={s.error}>
              {errors.monthly_limit}
            </p>
          )}
        </label>

        {submitError && (
          <p role="alert" className={s.error}>
            {submitError}
          </p>
        )}

        <Button
          id="add-budget-save-button"
          data-testid="add-budget-save-button"
          type="submit"
          disabled={submitting || noAvailableCategories}
        >
          {submitting ? 'Saving…' : 'Save budget'}
        </Button>
      </form>
    </section>
  )
}
