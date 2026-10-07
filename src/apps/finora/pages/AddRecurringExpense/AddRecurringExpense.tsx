import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { Select } from '@atoms/Select/Select'
import { GroupedSelect, type GroupedSelectGroup } from '@atoms/Select/GroupedSelect'
import { BackLink } from '@molecules/BackLink/BackLink'
import {
  createRecurringExpense,
  updateRecurringExpense,
  type RecurringExpenseInput,
  type RecurringExpenseWithDetails,
} from '@services/recurringExpensesService'
import { parseRecurringExpenseError } from '@services/recurringExpensesErrors'
import { useRecurringExpenses } from '@hooks/useRecurringExpenses'
import { useCategories } from '@hooks/useCategories'
import { buildCategoryTree, getCategoryDisplayName } from '@domain/category'
import { getCurrentTerm, type RecurringTerm } from '@domain/recurring'
import { getTodayLocalDate } from '@domain/date'
import { roundMoneyInput } from '@domain/money'
import { PAYMENT_METHODS } from '@domain/transaction'
import s from './AddRecurringExpense.module.css'

const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({ value: method, label: method }))

interface AddRecurringExpenseProps {
  mode: 'create' | 'edit'
}

/** Creates a recurring expense template, or edits an existing one's current term. */
export function AddRecurringExpense({ mode }: AddRecurringExpenseProps) {
  return mode === 'edit' ? <EditRecurringExpense /> : <RecurringExpenseForm mode="create" />
}

// Loads the template named in the route, then hands its current term to the form.
function EditRecurringExpense() {
  const { t } = useTranslation('recurring')
  const { id } = useParams<{ id: string }>()
  const { recurringExpenses, loading, error } = useRecurringExpenses()
  const recurringExpense = recurringExpenses.find((item) => item.id === id)

  if (loading) {
    return (
      <section className={s.section}>
        <p className={s.hint}>{t('form.loadingTemplate')}</p>
      </section>
    )
  }

  if (error || !recurringExpense) {
    return (
      <section className={s.section}>
        <BackLink to="/finora/recurring" data-testid="edit-recurring-expense-back-link">
          {t('form.backToRecurring')}
        </BackLink>
        <p role="alert" className={s.error}>
          {error ? t('form.loadError') : t('form.notFound')}
        </p>
      </section>
    )
  }

  // Matches update_recurring_expense's recurring_ended check: a cancelled
  // template (even one that still has a future end date) can't be edited.
  if (recurringExpense.ended_on !== null) {
    return (
      <section className={s.section}>
        <BackLink to="/finora/recurring" data-testid="edit-recurring-expense-back-link">
          {t('form.backToRecurring')}
        </BackLink>
        <p role="alert" className={s.error}>
          {t('form.cannotEditCancelled')}
        </p>
      </section>
    )
  }

  return <RecurringExpenseForm mode="edit" recurringExpense={recurringExpense} />
}

interface FormErrors {
  description?: string
  amount?: string
  category_id?: string
  payment_method?: string
  day_of_month?: string
  effective_from?: string
}

interface RecurringExpenseFormProps {
  mode: 'create' | 'edit'
  /** The template being edited; required in edit mode. */
  recurringExpense?: RecurringExpenseWithDetails
}

function RecurringExpenseForm({ mode, recurringExpense }: RecurringExpenseFormProps) {
  const { t } = useTranslation(['recurring', 'common'])
  const navigate = useNavigate()
  const { categories, loading: categoriesLoading } = useCategories()
  const isEdit = mode === 'edit' && !!recurringExpense
  const testIdPrefix = isEdit ? 'edit-recurring-expense' : 'add-recurring-expense'
  const today = getTodayLocalDate()

  const currentTerm = useMemo(() => {
    if (!recurringExpense) return null
    const terms: RecurringTerm[] = recurringExpense.terms.map((term) => ({
      effectiveFrom: term.effective_from,
      description: term.description,
      amount: term.amount,
      categoryId: term.category_id,
      paymentMethod: term.payment_method,
    }))
    return getCurrentTerm(terms, today)
  }, [recurringExpense, today])

  const [description, setDescription] = useState(currentTerm?.description ?? '')
  const [amount, setAmount] = useState(currentTerm ? String(currentTerm.amount) : '')
  const [categoryId, setCategoryId] = useState(currentTerm?.categoryId ?? '')
  const [paymentMethod, setPaymentMethod] = useState(currentTerm?.paymentMethod ?? '')
  const [dayOfMonth, setDayOfMonth] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const categoryGroups = useMemo<GroupedSelectGroup[]>(
    () =>
      buildCategoryTree(categories).map((group) => ({
        value: group.parent.id,
        label: getCategoryDisplayName(group.parent, t),
        children: group.children.map((child) => ({ value: child.id, label: getCategoryDisplayName(child, t) })),
      })),
    [categories, t]
  )

  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value)
    setErrors((prev) => (prev.description ? { ...prev, description: undefined } : prev))
  }, [])

  const handleAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value)
    setErrors((prev) => (prev.amount ? { ...prev, amount: undefined } : prev))
  }, [])

  // Visible rounding to 2 decimals, so the user sees what will be saved (ADR-005).
  const handleAmountBlur = useCallback(() => {
    setAmount((prev) => roundMoneyInput(prev))
  }, [])

  const handleCategoryChange = useCallback((nextCategoryId: string) => {
    setCategoryId(nextCategoryId)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
  }, [])

  const handlePaymentMethodChange = useCallback((nextPaymentMethod: string) => {
    setPaymentMethod(nextPaymentMethod)
    setErrors((prev) => (prev.payment_method ? { ...prev, payment_method: undefined } : prev))
  }, [])

  const handleDayOfMonthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDayOfMonth(event.target.value)
    setErrors((prev) => (prev.day_of_month ? { ...prev, day_of_month: undefined } : prev))
  }, [])

  const handleEffectiveFromChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEffectiveFrom(event.target.value)
    setErrors((prev) => (prev.effective_from ? { ...prev, effective_from: undefined } : prev))
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const trimmedDescription = description.trim()
      const parsedAmount = Number(amount)
      const nextErrors: FormErrors = {}

      if (!trimmedDescription) {
        nextErrors.description = t('common:validation.required')
      }
      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        nextErrors.amount = t('common:validation.amountGreaterThanZero')
      } else if (roundMoneyInput(amount) !== amount) {
        nextErrors.amount = t('recurring:validation.amountMaxDecimals')
      }
      if (!categoryId) {
        nextErrors.category_id = t('recurring:validation.selectCategory')
      }
      if (!paymentMethod) {
        nextErrors.payment_method = t('recurring:validation.selectPaymentMethod')
      }

      if (!isEdit) {
        const parsedDay = Number(dayOfMonth)
        if (!dayOfMonth || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
          nextErrors.day_of_month = t('recurring:validation.dayOfMonthRange')
        }
      } else if (!effectiveFrom || effectiveFrom <= today) {
        nextErrors.effective_from = t('recurring:validation.effectiveFromMustBeFuture')
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: RecurringExpenseInput = {
        description: trimmedDescription,
        amount: parsedAmount,
        category_id: categoryId,
        payment_method: paymentMethod,
      }

      const { error } =
        isEdit && recurringExpense
          ? await updateRecurringExpense(recurringExpense.id, effectiveFrom, input, today)
          : await createRecurringExpense(input, Number(dayOfMonth), today)

      setSubmitting(false)

      if (error) {
        const code = parseRecurringExpenseError(error)
        if (code === 'invalid_amount') {
          setErrors({ amount: t('recurring:validation.amountMaxDecimals') })
          return
        }
        if (code === 'effective_date_not_future' || code === 'recurring_term_conflict') {
          setErrors({ effective_from: t(`recurring:errors.${code}`) })
          return
        }
        setSubmitError(code ? t(`recurring:errors.${code}`) : error.message)
        return
      }

      navigate('/finora/recurring')
    },
    [description, amount, categoryId, paymentMethod, dayOfMonth, effectiveFrom, isEdit, recurringExpense, today, navigate, t]
  )

  return (
    <section className={s.section}>
      <BackLink to="/finora/recurring" data-testid={`${testIdPrefix}-back-link`}>
        {t('form.backToRecurring')}
      </BackLink>
      <h1 className={s.title}>{isEdit ? t('form.editTitle') : t('form.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <label className={s.field}>
          {t('form.description')}
          <input
            type="text"
            required
            value={description}
            onChange={handleDescriptionChange}
            className={s.input}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? `${testIdPrefix}-description-error` : undefined}
            data-testid={`${testIdPrefix}-description-input`}
          />
          {errors.description && (
            <p id={`${testIdPrefix}-description-error`} role="alert" className={s.error}>
              {errors.description}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('form.amount')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={handleAmountChange}
            onBlur={handleAmountBlur}
            className={s.input}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? `${testIdPrefix}-amount-error` : undefined}
            data-testid={`${testIdPrefix}-amount-input`}
          />
          {errors.amount && (
            <p id={`${testIdPrefix}-amount-error`} role="alert" className={s.error}>
              {errors.amount}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('form.category')}
          <GroupedSelect
            groups={categoryGroups}
            value={categoryId}
            onChange={handleCategoryChange}
            placeholder={categoriesLoading ? t('form.loadingTemplate') : t('recurring:validation.selectCategory')}
            disabled={categoriesLoading}
            ariaInvalid={!!errors.category_id}
            ariaDescribedBy={errors.category_id ? `${testIdPrefix}-category-error` : undefined}
            testId={`${testIdPrefix}-category-select`}
          />
          {errors.category_id && (
            <p id={`${testIdPrefix}-category-error`} role="alert" className={s.error}>
              {errors.category_id}
            </p>
          )}
        </label>

        <label className={s.field}>
          {t('form.paymentMethod')}
          <Select
            options={PAYMENT_METHOD_OPTIONS}
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            placeholder={t('recurring:validation.selectPaymentMethod')}
            ariaInvalid={!!errors.payment_method}
            ariaDescribedBy={errors.payment_method ? `${testIdPrefix}-payment-method-error` : undefined}
            testId={`${testIdPrefix}-payment-method-select`}
          />
          {errors.payment_method && (
            <p id={`${testIdPrefix}-payment-method-error`} role="alert" className={s.error}>
              {errors.payment_method}
            </p>
          )}
        </label>

        {!isEdit && (
          <label className={s.field}>
            {t('form.dayOfMonth')}
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              step="1"
              required
              value={dayOfMonth}
              onChange={handleDayOfMonthChange}
              className={s.input}
              aria-invalid={!!errors.day_of_month}
              aria-describedby={errors.day_of_month ? `${testIdPrefix}-day-of-month-error` : undefined}
              data-testid={`${testIdPrefix}-day-of-month-input`}
            />
            {errors.day_of_month && (
              <p id={`${testIdPrefix}-day-of-month-error`} role="alert" className={s.error}>
                {errors.day_of_month}
              </p>
            )}
          </label>
        )}

        {isEdit && recurringExpense && (
          <>
            <p className={s.hint}>{t('form.dayOfMonthHint', { day: recurringExpense.day_of_month })}</p>

            <label className={s.field}>
              {t('form.effectiveFrom')}
              <input
                type="date"
                required
                min={today}
                value={effectiveFrom}
                onChange={handleEffectiveFromChange}
                className={s.input}
                aria-invalid={!!errors.effective_from}
                aria-describedby={errors.effective_from ? `${testIdPrefix}-effective-from-error` : undefined}
                data-testid={`${testIdPrefix}-effective-from-input`}
              />
              {errors.effective_from && (
                <p id={`${testIdPrefix}-effective-from-error`} role="alert" className={s.error}>
                  {errors.effective_from}
                </p>
              )}
            </label>
            <p className={s.hint}>{t('form.effectiveFromHint')}</p>
          </>
        )}

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
          {submitting
            ? t('common:buttons.saving')
            : isEdit
              ? t('form.saveChanges')
              : t('form.saveRecurringExpense')}
        </Button>
      </form>
    </section>
  )
}
