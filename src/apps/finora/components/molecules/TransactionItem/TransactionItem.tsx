import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import cn from 'clsx'
import type { TransactionWithCategory } from '../../../services/transactionsService'
import { deleteTransaction } from '../../../services/transactionsService'
import { CategoryIcon } from '../../atoms/CategoryIcon/CategoryIcon'
import { Icon } from '../../atoms/Icon/Icon'
import s from './TransactionItem.module.css'

interface TransactionItemProps {
  transaction: TransactionWithCategory
  onDeleted: () => void
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

export function TransactionItem({ transaction, onDeleted }: TransactionItemProps) {
  const navigate = useNavigate()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isIncome = transaction.type === 'income'
  const isReimbursement = transaction.type === 'reimbursement'
  const amountLabel = `${isIncome || isReimbursement ? '+' : '-'}${currencyFormatter.format(Math.abs(transaction.amount))}`
  const fallbackIcon = transaction.category?.name?.[0] || '•'
  const paymentMethodsLabel = transaction.payments.map((payment) => payment.payment_method).join(' + ')

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
        <span className={s.deleteConfirmText}>Delete &quot;{transaction.description}&quot;?</span>
        <div className={s.deleteConfirmActions}>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className={s.deleteConfirmButton}
            data-testid={`transaction-item-${transaction.id}-confirm-delete-button`}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={handleCancelDelete}
            disabled={deleting}
            className={s.deleteCancelButton}
            data-testid={`transaction-item-${transaction.id}-cancel-delete-button`}
          >
            Cancel
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
            {transaction.category?.name ?? 'Uncategorized'}
            {paymentMethodsLabel ? ` · ${paymentMethodsLabel}` : ''}
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
          aria-label={`Edit ${transaction.description}`}
          className={s.actionIcon}
          data-testid={`transaction-item-${transaction.id}-edit-icon`}
        >
          <Icon name="edit" className={s.actionIconGlyph} />
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          aria-label={`Delete ${transaction.description}`}
          className={s.actionIcon}
          data-testid={`transaction-item-${transaction.id}-delete-icon`}
        >
          <Icon name="trash" className={s.actionIconGlyph} />
        </button>
      </div>
    </div>
  )
}
