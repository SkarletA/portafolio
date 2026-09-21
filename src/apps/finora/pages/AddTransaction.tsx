import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import { Button } from '../components/atoms/Button/Button'
import { CategoryIcon, CATEGORY_ICON_NAMES, DEFAULT_CATEGORY_ICON } from '../components/atoms/CategoryIcon/CategoryIcon'
import { useCategories } from '../hooks/useCategories'
import { useTransaction } from '../hooks/useTransaction'
import { createCategory } from '../services/categoriesService'
import { createTransaction, updateTransaction, type NewTransactionInput } from '../services/transactionsService'
import { buildCategoryTree, getCategoryDisplayName } from '../domain/category'
import { PAYMENT_METHODS, type TransactionType } from '../domain/transaction'
import { formatCurrency, getLocaleForLanguage } from '../domain/currency'
import { useCurrency } from '../context/CurrencyContext'
import { useLanguage } from '../context/LanguageContext'
import s from './AddTransaction.module.css'

const CATEGORY_COLORS = ['#2563eb', '#7c3aed', '#0ea5e9', '#f59e0b', '#ec4899', '#16a34a', '#dc2626', '#64748b']

const CREATE_NEW_CATEGORY_VALUE = '__create_new_category__'
const NONE_SUBCATEGORY_VALUE = '__none_subcategory__'
const OTHERS_SUBCATEGORY_VALUE = '__others_subcategory__'

function getTodayLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

interface FormErrors {
  amount?: string
  description?: string
  category_id?: string
  date?: string
  payments?: string
}

interface PaymentEntry {
  paymentMethod: string
  checked: boolean
  amount: string
}

function buildInitialPayments(): PaymentEntry[] {
  return PAYMENT_METHODS.map((method) => ({ paymentMethod: method, checked: false, amount: '' }))
}

interface AddTransactionProps {
  mode: 'create' | 'edit'
}

export function AddTransaction({ mode }: AddTransactionProps) {
  const { t } = useTranslation(['transactions', 'common', 'categories'])
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories()
  const {
    transaction,
    loading: transactionLoading,
    error: transactionError,
  } = useTransaction(mode === 'edit' ? id : undefined)

  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(getTodayLocalDate)
  const [notes, setNotes] = useState('')
  const [payments, setPayments] = useState<PaymentEntry[]>(buildInitialPayments)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [hasPreloaded, setHasPreloaded] = useState(false)

  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryParentId, setNewCategoryParentId] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0])
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICON_NAMES[0])
  const [categoryCreateError, setCategoryCreateError] = useState<string | null>(null)
  const [creatingCategory, setCreatingCategory] = useState(false)

  const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false)
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [subcategoryCreateError, setSubcategoryCreateError] = useState<string | null>(null)
  const [creatingSubcategory, setCreatingSubcategory] = useState(false)

  const categoryGroups = useMemo(() => buildCategoryTree(categories), [categories])

  const selectedGroup = useMemo(() => {
    if (!categoryId) return null

    return (
      categoryGroups.find((group) => group.parent.id === categoryId) ??
      categoryGroups.find((group) => group.children.some((child) => child.id === categoryId)) ??
      null
    )
  }, [categoryId, categoryGroups])

  const selectedParent = selectedGroup?.parent ?? null

  useEffect(() => {
    if (mode !== 'edit' || !transaction || hasPreloaded) return

    setType(transaction.type)
    setAmount(String(transaction.amount))
    setDescription(transaction.description)
    setCategoryId(transaction.category_id ?? '')
    setDate(transaction.date)
    setNotes(transaction.notes ?? '')
    setPayments(
      PAYMENT_METHODS.map((method) => {
        const existing = transaction.payments.find((payment) => payment.payment_method === method)
        return { paymentMethod: method, checked: !!existing, amount: existing ? String(existing.amount) : '' }
      })
    )
    setHasPreloaded(true)
  }, [mode, transaction, hasPreloaded])

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
    const value = event.target.value

    if (value === CREATE_NEW_CATEGORY_VALUE) {
      setIsCreatingCategory(true)
      return
    }

    setCategoryId(value)
    setIsCreatingSubcategory(false)
    setNewSubcategoryName('')
    setSubcategoryCreateError(null)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
  }, [])

  const handleSubcategoryChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value

      if (value === OTHERS_SUBCATEGORY_VALUE) {
        setIsCreatingSubcategory(true)
        return
      }

      setIsCreatingSubcategory(false)

      if (value === NONE_SUBCATEGORY_VALUE) {
        if (selectedParent) setCategoryId(selectedParent.id)
        return
      }

      setCategoryId(value)
      setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
    },
    [selectedParent]
  )

  const handleNewSubcategoryNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewSubcategoryName(event.target.value)
    setSubcategoryCreateError(null)
  }, [])

  const handleNewSubcategoryBlur = useCallback(async () => {
    const trimmedName = newSubcategoryName.trim()

    if (!trimmedName || !selectedParent) {
      setIsCreatingSubcategory(false)
      setNewSubcategoryName('')
      return
    }

    setCreatingSubcategory(true)
    setSubcategoryCreateError(null)

    const { data, error } = await createCategory({
      name: trimmedName,
      icon: DEFAULT_CATEGORY_ICON,
      color: selectedParent.color ?? CATEGORY_COLORS[0],
      parent_id: selectedParent.id,
    })

    setCreatingSubcategory(false)

    if (error || !data) {
      setSubcategoryCreateError(error?.message ?? t('transactions:form.couldNotCreateSubcategory'))
      return
    }

    await refetchCategories()
    setCategoryId(data.id)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
    setIsCreatingSubcategory(false)
    setNewSubcategoryName('')
  }, [newSubcategoryName, selectedParent, refetchCategories, t])

  const handleDateChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDate(event.target.value)
    setErrors((prev) => (prev.date ? { ...prev, date: undefined } : prev))
  }, [])

  const handleNotesChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(event.target.value)
  }, [])

  const handlePaymentCheckedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const method = event.target.dataset.method
    if (!method) return

    const checked = event.target.checked
    setPayments((prev) =>
      prev.map((payment) =>
        payment.paymentMethod === method ? { ...payment, checked, amount: checked ? payment.amount : '' } : payment
      )
    )
    setErrors((prev) => (prev.payments ? { ...prev, payments: undefined } : prev))
  }, [])

  const handlePaymentAmountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const method = event.target.dataset.method
    if (!method) return

    const value = event.target.value
    setPayments((prev) => prev.map((payment) => (payment.paymentMethod === method ? { ...payment, amount: value } : payment)))
    setErrors((prev) => (prev.payments ? { ...prev, payments: undefined } : prev))
  }, [])

  const handleNewCategoryNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewCategoryName(event.target.value)
    setCategoryCreateError(null)
  }, [])

  const handleNewCategoryParentChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setNewCategoryParentId(event.target.value)
  }, [])

  const handleNewCategoryColorClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const color = event.currentTarget.dataset.color
    if (color) setNewCategoryColor(color)
  }, [])

  const handleNewCategoryIconClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const iconName = event.currentTarget.dataset.icon
    if (iconName) setNewCategoryIcon(iconName)
  }, [])

  const handleCancelNewCategory = useCallback(() => {
    setIsCreatingCategory(false)
    setNewCategoryName('')
    setNewCategoryParentId('')
    setNewCategoryColor(CATEGORY_COLORS[0])
    setNewCategoryIcon(CATEGORY_ICON_NAMES[0])
    setCategoryCreateError(null)
  }, [])

  const handleConfirmNewCategory = useCallback(async () => {
    const trimmedName = newCategoryName.trim()

    if (!trimmedName) {
      setCategoryCreateError(t('common:validation.nameRequired'))
      return
    }

    setCreatingCategory(true)
    setCategoryCreateError(null)

    const { data, error } = await createCategory({
      name: trimmedName,
      icon: newCategoryIcon,
      color: newCategoryColor,
      parent_id: newCategoryParentId || null,
    })

    setCreatingCategory(false)

    if (error || !data) {
      setCategoryCreateError(error?.message ?? t('transactions:form.couldNotCreateCategory'))
      return
    }

    await refetchCategories()
    setCategoryId(data.id)
    setErrors((prev) => (prev.category_id ? { ...prev, category_id: undefined } : prev))
    handleCancelNewCategory()
  }, [newCategoryName, newCategoryIcon, newCategoryColor, newCategoryParentId, refetchCategories, handleCancelNewCategory, t])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedAmount = Number(amount)
      const trimmedDescription = description.trim()
      const nextErrors: FormErrors = {}

      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        nextErrors.amount = t('common:validation.amountGreaterThanZero')
      }
      if (!trimmedDescription) {
        nextErrors.description = t('transactions:validation.descriptionRequired')
      }
      if (!categoryId) {
        nextErrors.category_id = t('transactions:validation.selectCategory')
      }
      if (!date) {
        nextErrors.date = t('transactions:validation.selectDate')
      }

      const checkedPayments = payments.filter((payment) => payment.checked)

      if (checkedPayments.length === 0) {
        nextErrors.payments = t('transactions:validation.selectPaymentMethod')
      } else {
        const hasInvalidAmount = checkedPayments.some(
          (payment) => !payment.amount || Number.isNaN(Number(payment.amount)) || Number(payment.amount) <= 0
        )

        if (hasInvalidAmount) {
          nextErrors.payments = t('transactions:validation.amountGreaterThanZeroEach')
        } else {
          const assigned = checkedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

          if (Math.abs(assigned - parsedAmount) > 0.001) {
            nextErrors.payments = t('transactions:validation.assignedMustEqualTotal', {
              assigned: formatCurrency(assigned, currency, locale),
              total: formatCurrency(parsedAmount || 0, currency, locale),
            })
          }
        }
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
        date,
        notes: notes.trim() || null,
        payments: checkedPayments.map((payment) => ({
          payment_method: payment.paymentMethod,
          amount: Number(payment.amount),
        })),
      }

      const { error } = mode === 'edit' && id ? await updateTransaction(id, input) : await createTransaction(input)

      setSubmitting(false)

      if (error) {
        setSubmitError(error.message)
        return
      }

      navigate('/finora/transactions')
    },
    [amount, description, categoryId, date, notes, type, payments, mode, id, navigate, t, currency, locale]
  )

  const assignedTotal = payments.reduce(
    (sum, payment) => sum + (payment.checked ? Number(payment.amount) || 0 : 0),
    0
  )
  const totalAmount = Number(amount) || 0

  if (mode === 'edit' && transactionLoading) {
    return (
      <section className={s.section}>
        <p className={s.hint}>{t('transactions:form.loadingTransaction')}</p>
      </section>
    )
  }

  if (mode === 'edit' && transactionError) {
    return (
      <section className={s.section}>
        <p className={s.error}>{t('transactions:form.loadError')}</p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>{mode === 'edit' ? t('transactions:form.editTitle') : t('transactions:form.addTitle')}</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <div className={s.typeToggle} role="group" aria-label={t('transactions:form.typeAriaLabel')}>
          <button
            type="button"
            data-type="expense"
            aria-pressed={type === 'expense'}
            onClick={handleTypeChange}
            className={cn(s.typeButton, type === 'expense' && s.typeButtonActiveExpense)}
            data-testid="add-transaction-type-expense-button"
          >
            {t('transactions:form.type.expense')}
          </button>
          <button
            type="button"
            data-type="income"
            aria-pressed={type === 'income'}
            onClick={handleTypeChange}
            className={cn(s.typeButton, type === 'income' && s.typeButtonActiveIncome)}
            data-testid="add-transaction-type-income-button"
          >
            {t('transactions:form.type.income')}
          </button>
          <button
            type="button"
            data-type="reimbursement"
            aria-pressed={type === 'reimbursement'}
            onClick={handleTypeChange}
            className={cn(s.typeButton, type === 'reimbursement' && s.typeButtonActiveReimbursement)}
            data-testid="add-transaction-type-reimbursement-button"
          >
            {t('transactions:form.type.reimbursement')}
          </button>
        </div>

        <label className={s.field}>
          {t('transactions:form.amount')}
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
          {t('transactions:form.description')}
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
          {t('transactions:form.category')}
          <select
            required
            value={selectedParent?.id ?? ''}
            onChange={handleCategoryChange}
            className={s.select}
            disabled={categoriesLoading}
            aria-invalid={!!errors.category_id}
            aria-describedby={errors.category_id ? 'add-transaction-category-error' : undefined}
            data-testid="add-transaction-category-select"
          >
            <option value="" disabled={categories.length > 0}>
              {categoriesLoading ? t('transactions:form.loadingCategories') : t('transactions:form.selectCategory')}
            </option>
            {categoryGroups.map((group) => (
              <option key={group.parent.id} value={group.parent.id}>
                {getCategoryDisplayName(group.parent, t)}
              </option>
            ))}
            <option value={CREATE_NEW_CATEGORY_VALUE}>{t('transactions:form.createNewCategory')}</option>
          </select>
          {errors.category_id && (
            <p id="add-transaction-category-error" role="alert" className={s.error}>
              {errors.category_id}
            </p>
          )}
          {categoriesError && (
            <p role="alert" className={s.error}>
              {t('transactions:form.couldntLoadCategories', { message: categoriesError })}
            </p>
          )}
        </label>

        {selectedGroup && (
          <label className={s.field}>
            {t('transactions:form.subcategory')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
            <select
              value={
                isCreatingSubcategory
                  ? OTHERS_SUBCATEGORY_VALUE
                  : categoryId === selectedGroup.parent.id
                    ? NONE_SUBCATEGORY_VALUE
                    : categoryId
              }
              onChange={handleSubcategoryChange}
              className={s.select}
              data-testid="add-transaction-subcategory-select"
            >
              <option value={NONE_SUBCATEGORY_VALUE}>
                {t('transactions:form.noneUseDirectly', { category: getCategoryDisplayName(selectedGroup.parent, t) })}
              </option>
              {selectedGroup.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {getCategoryDisplayName(child, t)}
                </option>
              ))}
              <option value={OTHERS_SUBCATEGORY_VALUE}>{t('transactions:form.createNewSubcategory')}</option>
            </select>
            {isCreatingSubcategory && (
              <>
                <input
                  type="text"
                  autoFocus
                  value={newSubcategoryName}
                  onChange={handleNewSubcategoryNameChange}
                  onBlur={handleNewSubcategoryBlur}
                  placeholder={t('transactions:form.newSubcategoryPlaceholder')}
                  className={s.input}
                  disabled={creatingSubcategory}
                  data-testid="add-transaction-new-subcategory-input"
                />
                {creatingSubcategory && <p className={s.hint}>{t('common:buttons.creating')}</p>}
                {subcategoryCreateError && (
                  <p role="alert" className={s.error}>
                    {subcategoryCreateError}
                  </p>
                )}
              </>
            )}
          </label>
        )}

        {isCreatingCategory && (
          <div className={s.categoryCreate}>
            <label className={s.field}>
              {t('transactions:form.newCategoryName')}
              <input
                type="text"
                value={newCategoryName}
                onChange={handleNewCategoryNameChange}
                className={s.input}
                data-testid="add-transaction-new-category-name-input"
              />
            </label>

            <label className={s.field}>
              {t('transactions:form.parentCategory')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
              <select
                value={newCategoryParentId}
                onChange={handleNewCategoryParentChange}
                className={s.select}
                data-testid="add-transaction-new-category-parent-select"
              >
                <option value="">{t('transactions:form.noneTopLevel')}</option>
                {categoryGroups.map((group) => (
                  <option key={group.parent.id} value={group.parent.id}>
                    {getCategoryDisplayName(group.parent, t)}
                  </option>
                ))}
              </select>
            </label>

            <div className={s.field}>
              {t('transactions:form.color')}
              <div className={s.colorPicker} role="group" aria-label={t('transactions:form.colorAriaLabel')}>
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    data-color={color}
                    onClick={handleNewCategoryColorClick}
                    aria-pressed={newCategoryColor === color}
                    aria-label={t('transactions:form.colorSwatchAriaLabel', { color })}
                    className={cn(s.colorSwatch, newCategoryColor === color && s.colorSwatchActive)}
                    style={{ backgroundColor: color }}
                    data-testid={`add-transaction-new-category-color-${color.replace('#', '')}-button`}
                  />
                ))}
              </div>
            </div>

            <div className={s.field}>
              {t('transactions:form.icon')}
              <div className={s.iconPicker} role="group" aria-label={t('transactions:form.iconAriaLabel')}>
                {CATEGORY_ICON_NAMES.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    data-icon={iconName}
                    onClick={handleNewCategoryIconClick}
                    aria-pressed={newCategoryIcon === iconName}
                    aria-label={t('transactions:form.iconSwatchAriaLabel', { icon: iconName })}
                    className={cn(s.iconSwatch, newCategoryIcon === iconName && s.iconSwatchActive)}
                    data-testid={`add-transaction-new-category-icon-${iconName}-button`}
                  >
                    <CategoryIcon name={iconName} fallbackLabel="?" className={s.iconSwatchIcon} />
                  </button>
                ))}
              </div>
            </div>

            {categoryCreateError && (
              <p role="alert" className={s.error}>
                {categoryCreateError}
              </p>
            )}

            <div className={s.categoryCreateActions}>
              <Button
                id="add-transaction-confirm-new-category-button"
                data-testid="add-transaction-confirm-new-category-button"
                type="button"
                onClick={handleConfirmNewCategory}
                disabled={creatingCategory}
                className={s.actionButton}
              >
                {creatingCategory ? t('common:buttons.creating') : t('transactions:form.createCategory')}
              </Button>
              <Button
                id="add-transaction-cancel-new-category-button"
                data-testid="add-transaction-cancel-new-category-button"
                type="button"
                variant="secondary"
                onClick={handleCancelNewCategory}
                disabled={creatingCategory}
                className={s.actionButton}
              >
                {t('common:buttons.cancel')}
              </Button>
            </div>
          </div>
        )}

        <div className={s.field}>
          {t('transactions:form.paymentMethods')}
          <div className={s.paymentMethodList} role="group" aria-label={t('transactions:form.paymentMethodsAriaLabel')}>
            {payments.map((payment) => (
              <div key={payment.paymentMethod} className={s.paymentMethodRow}>
                <label className={s.paymentMethodCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={payment.checked}
                    onChange={handlePaymentCheckedChange}
                    data-method={payment.paymentMethod}
                    data-testid={`add-transaction-payment-${slugify(payment.paymentMethod)}-checkbox`}
                  />
                  {payment.paymentMethod}
                </label>
                {payment.checked && (
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={payment.amount}
                    onChange={handlePaymentAmountChange}
                    data-method={payment.paymentMethod}
                    className={s.paymentMethodAmountInput}
                    aria-label={t('transactions:form.amountPaidWith', { method: payment.paymentMethod })}
                    data-testid={`add-transaction-payment-${slugify(payment.paymentMethod)}-amount-input`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className={cn(s.paymentSummary, assignedTotal !== totalAmount && s.paymentSummaryMismatch)}>
            {t('transactions:form.assignedSummary', {
              assigned: formatCurrency(assignedTotal, currency, locale),
              total: formatCurrency(totalAmount, currency, locale),
            })}
          </p>
          {errors.payments && (
            <p role="alert" className={s.error}>
              {errors.payments}
            </p>
          )}
        </div>

        <label className={s.field}>
          {t('transactions:form.date')}
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
          {t('transactions:form.notes')}
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
          {submitting
            ? t('common:buttons.saving')
            : mode === 'edit'
              ? t('common:buttons.saveChanges')
              : t('transactions:form.saveTransaction')}
        </Button>
      </form>
    </section>
  )
}
