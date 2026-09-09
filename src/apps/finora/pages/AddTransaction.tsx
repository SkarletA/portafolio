import { useCallback, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import cn from 'clsx'
import { Button } from '../components/atoms/Button/Button'
import { useCategories } from '../hooks/useCategories'
import { createTransaction, type NewTransactionInput } from '../services/transactionsService'
import type { TransactionType } from '../domain/transaction'
import s from './AddTransaction.module.css'

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer']

function getTodayLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface FormErrors {
  amount?: string
  description?: string
  category_id?: string
  date?: string
}

export function AddTransaction() {
  const navigate = useNavigate()
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories()

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0])
  const [date, setDate] = useState(getTodayLocalDate)
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleTypeChange = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextType = event.currentTarget.dataset.type as TransactionType | undefined
    if (nextType) setType(nextType)
  }, [])

  const handleAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAmount(event.target.value)
    setErrors((prev) => (prev.amount ? { ...prev, amount: undefined } : prev))
  }, [])

  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value)
    setErrors((prev) => (prev.description ? { ...prev, description: undefined } : prev))
  }, [])

  const handleCategoryChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(event.target.value)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
  }, [])

  const handlePaymentMethodChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setPaymentMethod(event.target.value)
  }, [])

  const handleDateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value)
    setErrors((prev) => (prev.date ? { ...prev, date: undefined } : prev))
  }, [])

  const handleNotesChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedAmount = Number(amount)
      const trimmedDescription = description.trim()
      const nextErrors: FormErrors = {}

      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        nextErrors.amount = 'Enter an amount greater than 0'
      }
      if (!trimmedDescription) {
        nextErrors.description = 'Description is required'
      }
      if (!categoryId) {
        nextErrors.category_id = 'Select a category'
      }
      if (!date) {
        nextErrors.date = 'Select a date'
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: NewTransactionInput = {
        description: trimmedDescription,
        amount: parsedAmount,
        type,
        category_id: categoryId,
        payment_method: paymentMethod,
        date,
        notes: notes.trim() || null,
      }

      const { error } = await createTransaction(input)

      setSubmitting(false)

      if (error) {
        setSubmitError(error.message)
        return
      }

      navigate('/finora/transactions')
    },
    [amount, description, categoryId, paymentMethod, date, notes, type, navigate]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>Add transaction</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <div className={s.typeToggle} role="group" aria-label="Transaction type">
          <button
            type="button"
            data-type="expense"
            aria-pressed={type === 'expense'}
            onClick={handleTypeChange}
            className={cn(s.typeButton, type === 'expense' && s.typeButtonActiveExpense)}
            data-testid="add-transaction-type-expense-button"
          >
            Expense
          </button>
          <button
            type="button"
            data-type="income"
            aria-pressed={type === 'income'}
            onClick={handleTypeChange}
            className={cn(s.typeButton, type === 'income' && s.typeButtonActiveIncome)}
            data-testid="add-transaction-type-income-button"
          >
            Income
          </button>
        </div>

        <label className={s.field}>
          Amount
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={amount}
            onChange={handleAmountChange}
            className={s.input}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'add-transaction-amount-error' : undefined}
            data-testid="add-transaction-amount-input"
          />
          {errors.amount && (
            <p id="add-transaction-amount-error" role="alert" className={s.error}>
              {errors.amount}
            </p>
          )}
        </label>

        <label className={s.field}>
          Description
          <input
            type="text"
            required
            value={description}
            onChange={handleDescriptionChange}
            className={s.input}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'add-transaction-description-error' : undefined}
            data-testid="add-transaction-description-input"
          />
          {errors.description && (
            <p id="add-transaction-description-error" role="alert" className={s.error}>
              {errors.description}
            </p>
          )}
        </label>

        <label className={s.field}>
          Category
          <select
            required
            value={categoryId}
            onChange={handleCategoryChange}
            className={s.select}
            disabled={categoriesLoading}
            aria-invalid={!!errors.category_id}
            aria-describedby={errors.category_id ? 'add-transaction-category-error' : undefined}
            data-testid="add-transaction-category-select"
          >
            <option value="" disabled={categories.length > 0}>
              {categoriesLoading ? 'Loading categories…' : 'Select a category'}
            </option>
            {!categoriesLoading && categories.length === 0 && !categoriesError && (
              <option value="" disabled>
                No categories available
              </option>
            )}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p id="add-transaction-category-error" role="alert" className={s.error}>
              {errors.category_id}
            </p>
          )}
          {categoriesError && (
            <p role="alert" className={s.error}>
              Couldn&apos;t load categories: {categoriesError}
            </p>
          )}
        </label>

        <label className={s.field}>
          Payment method
          <select
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            className={s.select}
            data-testid="add-transaction-payment-method-select"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>

        <label className={s.field}>
          Date
          <input
            type="date"
            required
            value={date}
            onChange={handleDateChange}
            className={s.input}
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'add-transaction-date-error' : undefined}
            data-testid="add-transaction-date-input"
          />
          {errors.date && (
            <p id="add-transaction-date-error" role="alert" className={s.error}>
              {errors.date}
            </p>
          )}
        </label>

        <label className={s.field}>
          Notes
          <textarea
            value={notes}
            onChange={handleNotesChange}
            className={s.textarea}
            rows={3}
            data-testid="add-transaction-notes-textarea"
          />
        </label>

        {submitError && (
          <p role="alert" className={s.error}>
            {submitError}
          </p>
        )}

        <Button
          id="add-transaction-save-button"
          data-testid="add-transaction-save-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Save transaction'}
        </Button>
      </form>
    </section>
  )
}
