import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import type { TransactionWithCategory } from '@services/transactionsService'
import { deleteTransaction } from '@services/transactionsService'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { allocateInstallments } from '@domain/installments'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import { Icon } from '@atoms/Icon/Icon'
import s from './TransactionItem.module.css'

interface TransactionItemProps {
  transaction: TransactionWithCategory
  /** Called after a successful delete, so the caller can refresh its list. */
  onDeleted: () => void
}

// The first installment's amount, for the list's "N monthly payments of $X"
// label. A financed row the domain can't split exactly (e.g. more than 2
// decimals written outside the form) shows the count without an amount
// rather than breaking the list.
function getFirstInstallmentAmount(amount: number, months: number): number | null {
  try {
    return allocateInstallments(amount, months)[0]
  } catch {
    return null
  }
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

/** A single transaction row: description, category, date, signed amount, and edit/delete actions. */
export function TransactionItem({ transaction, onDeleted }: TransactionItemProps) {
  const { t } = useTranslation(['transactions', 'common', 'categories'])
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const locale = getLocaleForLanguage(language)
  const isIncome = transaction.type === 'income'
  const isReimbursement = transaction.type === 'reimbursement'
  const amountLabel = `${isIncome || isReimbursement ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount), currency, locale)}`
  const categoryDisplayName = transaction.category ? getCategoryDisplayName(transaction.category, t) : null
  const fallbackIcon = categoryDisplayName?.[0] || '•'
  const paymentMethodsLabel = transaction.payments.map((payment) => payment.payment_method).join(' + ')
  const isFinanced = transaction.installment_months > 1
  const firstInstallmentAmount = isFinanced
    ? getFirstInstallmentAmount(transaction.amount, transaction.installment_months)
    : null
  const installmentsLabel = !isFinanced
    ? null
    : firstInstallmentAmount === null
      ? t('item.installmentsCount', { count: transaction.installment_months })
      : t('item.installmentsSummary', {
          count: transaction.installment_months,
          amount: formatCurrency(firstInstallmentAmount, currency, locale),
        })
  const isSavingsFunded = transaction.funding_source === 'savings'
  const savingsGoalName = transaction.withdrawal?.goal?.name ?? null
  const savingsLabel = !isSavingsFunded
    ? null
    : savingsGoalName
      ? t('item.coveredBySavingsFrom', { goal: savingsGoalName })
      : t('item.coveredBySavings')

  const handleEditClick = useCallback(() => {
    navigate(`/finora/transactions/${transaction.id}/edit`)
  }, [navigate, transaction.id])

  const handleDeleteClick = useCallback(() => {
    setIsConfirmingDelete(true)
  }, [])

  const handleCancelDelete = useCallback(() => {
    setIsConfirmingDelete(false)
    setDeleteError(null)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    setDeleting(true)
    setDeleteError(null)

    const { error } = await deleteTransaction(transaction.id)

    setDeleting(false)

    if (error) {
      setDeleteError(error.message)
      return
    }

    onDeleted()
  }, [transaction.id, onDeleted])

  if (isConfirmingDelete) {
    return (
      <div className={s.deleteConfirmRow}>
        <span className={s.deleteConfirmText}>
          {isFinanced
            ? t('item.confirmDeleteFinanced', {
                description: transaction.description,
                count: transaction.installment_months,
              })
            : t('item.confirmDelete', { description: transaction.description })}
        </span>
        <div className={s.deleteConfirmActions}>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className={s.deleteConfirmButton}
            data-testid={`transaction-item-${transaction.id}-confirm-delete-button`}
          >
            {deleting ? t('common:buttons.deleting') : t('common:buttons.delete')}
          </button>
          <button
            type="button"
            onClick={handleCancelDelete}
            disabled={deleting}
            className={s.deleteCancelButton}
            data-testid={`transaction-item-${transaction.id}-cancel-delete-button`}
          >
            {t('common:buttons.cancel')}
          </button>
        </div>
        {deleteError && (
          <p role="alert" className={s.error}>
            {deleteError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={s.row}>
      <div className={s.main}>
        <div className={s.icon}>
          <CategoryIcon
            name={transaction.category?.icon ?? null}
            fallbackLabel={fallbackIcon}
            className={s.categoryIcon}
          />
        </div>
        <div className={s.info}>
          <p className={s.description}>{transaction.description}</p>
          <p className={s.meta}>
            {categoryDisplayName ?? t('item.uncategorized')}
            {paymentMethodsLabel ? ` · ${paymentMethodsLabel}` : ''}
            {installmentsLabel ? ` · ${installmentsLabel}` : ''}
            {savingsLabel ? ` · ${savingsLabel}` : ''}
          </p>
        </div>
      </div>

      <p className={s.date}>{dateFormatter.format(new Date(transaction.date))}</p>

      <p className={cn(s.amount, isReimbursement ? s.reimbursement : isIncome ? s.income : s.expense)}>
        {amountLabel}
      </p>

      <div className={s.actions}>
        <button
          type="button"
          onClick={handleEditClick}
          aria-label={t('item.editAriaLabel', { description: transaction.description })}
          className={s.actionIcon}
          data-testid={`transaction-item-${transaction.id}-edit-icon`}
        >
          <Icon name="edit" className={s.actionIconGlyph} />
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label={t('item.deleteAriaLabel', { description: transaction.description })}
          className={s.actionIcon}
          data-testid={`transaction-item-${transaction.id}-delete-icon`}
        >
          <Icon name="trash" className={s.actionIconGlyph} />
        </button>
      </div>
    </div>
  )
}
