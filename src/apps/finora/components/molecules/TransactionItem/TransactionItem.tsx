import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PiggyBank, Undo2, Users } from 'lucide-react'
import cn from 'clsx'
import type { TransactionWithCategory } from '@services/transactionsService'
import { deleteTransaction } from '@services/transactionsService'
import { parseMoneyMovementError, PurchaseHasLinkedRefundsError } from '@services/moneyMovementErrors'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { allocateInstallments } from '@domain/installments'
import type { RefundSummary } from '@domain/refund'
import { getHouseholdPartnerDisplayName } from '@domain/household'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { useAuth } from '@context/AuthContext'
import { useHousehold } from '@context/HouseholdContext'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import { Icon } from '@atoms/Icon/Icon'
import { Badge } from '@atoms/Badge/Badge'
import s from './TransactionItem.module.css'

interface TransactionItemProps {
  transaction: TransactionWithCategory
  /** Called after a successful delete, so the caller can refresh its list. */
  onDeleted: () => void
  /** The purchase this reimbursement refunds, when linked (ADR-006). */
  refundedPurchase?: Pick<TransactionWithCategory, 'id' | 'description'> | null
  /** This purchase's linked reimbursements, when any exist (ADR-006). */
  refundsSummary?: RefundSummary | null
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
export function TransactionItem({ transaction, onDeleted, refundedPurchase = null, refundsSummary = null }: TransactionItemProps) {
  const { t } = useTranslation(['transactions', 'common', 'categories'])
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const { user } = useAuth()
  const { partner } = useHousehold()
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
  // funding_source also marks a reimbursement whose money returns to a Goal
  // (ADR-006); "covered by savings" only describes an expense's own funding.
  const isSavingsFunded = transaction.type === 'expense' && transaction.funding_source === 'savings'
  const savingsGoalName = transaction.goal_transfer?.goal?.name ?? null
  const savingsGoalId = transaction.goal_transfer?.goal_id ?? null
  // Chip text, not the old meta-line label - see the CONTEXT_CHIP block below.
  const savingsChipLabel = !isSavingsFunded
    ? null
    : savingsGoalName
      ? t('item.chips.coveredBySavings', { goal: savingsGoalName })
      : t('item.coveredBySavings')

  // A reimbursement linked to a purchase (ADR-006): its own text, and, when
  // that purchase was covered by savings, that the money returned to the Goal
  // - always as text, never color alone.
  const refundOfLabel = isReimbursement && refundedPurchase ? t('item.refundOf', { description: refundedPurchase.description }) : null
  const isRefundToGoal = isReimbursement && transaction.funding_source === 'savings'
  const refundGoalLabel = !isRefundToGoal
    ? null
    : savingsGoalName
      ? t('item.refundReturnedToGoalFrom', { goal: savingsGoalName })
      : t('item.refundReturnedToGoal')
  const refundsSummaryLabel =
    refundsSummary && refundsSummary.count > 0
      ? t('item.refundsSummary', { count: refundsSummary.count, total: formatCurrency(refundsSummary.total, currency, locale) })
      : null

  // A household view lists both members' rows (PR5, ADR-007); only the owner
  // may edit or delete their own transaction - forming a household or
  // appearing in a share never grants write access to anyone else's.
  const isOwner = transaction.user_id === user?.id
  const partnerName = getHouseholdPartnerDisplayName(partner)
  const paidByLabel = t('item.paidBy', { who: isOwner ? t('item.you') : (partnerName ?? '') })

  // See docs/adr/009-shared-expense-split.md: accounting only, not who can see
  // this row - ADR-007 already gives the household full visibility either
  // way. Always "your part" first, regardless of who owns the row, so the
  // chips read the same whether it's your own shared expense or your
  // partner's.
  const myShare = transaction.is_shared ? transaction.shares.find((share) => share.user_id === user?.id) : null
  const partnerShare = transaction.is_shared ? transaction.shares.find((share) => share.user_id !== user?.id) : null

  // Case B (docs/adr/010-household-expense-tag-and-household-budget.md): a
  // gray context chip, like refund-of and covered-by-savings below - there is
  // no split amount to show, only that this expense counts toward the
  // household. See the CONTEXT_CHIP rule above handleRefundChipClick.
  const householdExpenseLabel = transaction.is_household_expense ? t('item.householdExpenseTag') : null

  const handleEditClick = useCallback(() => {
    navigate(`/finora/transactions/${transaction.id}/edit`)
  }, [navigate, transaction.id])

  // CONTEXT_CHIP rule: a blue chip (Badge variant="shared", above) is money
  // split between people - it always shows two amounts (docs/adr/009). A gray
  // chip (Badge variant="context", below) is single-line informational
  // context with no amount breakdown at all - what it's about, not who owes
  // what. Any future per-row metadata (e.g. "12 monthly payments") follows
  // this same gray-chip pattern, not a third style.
  const handleRefundChipClick = useCallback(() => {
    if (refundedPurchase) navigate(`/finora/transactions/${refundedPurchase.id}/edit`)
  }, [navigate, refundedPurchase])

  const handleSavingsChipClick = useCallback(() => {
    if (savingsGoalId) navigate(`/finora/goals?activity=${savingsGoalId}`)
  }, [navigate, savingsGoalId])

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
      // A purchase with linked reimbursements: name them so the user knows
      // what to unlink or delete first (ADR-006).
      if (error instanceof PurchaseHasLinkedRefundsError) {
        setDeleteError(
          t('item.deleteBlockedByRefunds', {
            count: error.refunds.length,
            list: error.refunds
              .map((refund) =>
                t('item.refundListItem', { description: refund.description, amount: formatCurrency(refund.amount, currency, locale) })
              )
              .join(', '),
          })
        )
        return
      }

      // Deleting a reimbursement whose Goal already spent the refunded money.
      if (parseMoneyMovementError(error)?.code === 'goal_balance_negative') {
        setDeleteError(t('item.goalBalanceNegative'))
        return
      }

      setDeleteError(error.message)
      return
    }

    onDeleted()
  }, [transaction.id, onDeleted, t, currency, locale])

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
            {` · ${paidByLabel}`}
            {paymentMethodsLabel ? ` · ${paymentMethodsLabel}` : ''}
            {installmentsLabel ? ` · ${installmentsLabel}` : ''}
            {refundGoalLabel ? ` · ${refundGoalLabel}` : ''}
            {refundsSummaryLabel ? ` · ${refundsSummaryLabel}` : ''}
          </p>
          {transaction.is_shared && myShare && partnerShare && (
            <div className={s.sharedChips}>
              <Badge variant="shared">{t('item.chipYou', { amount: formatCurrency(myShare.amount, currency, locale) })}</Badge>
              <Badge variant="shared">
                {t('item.chipOther', { name: partnerName ?? '', amount: formatCurrency(partnerShare.amount, currency, locale) })}
              </Badge>
            </div>
          )}
          {(refundOfLabel || savingsChipLabel || householdExpenseLabel) && (
            <div className={s.contextChips}>
              {refundOfLabel && (
                <button
                  type="button"
                  onClick={handleRefundChipClick}
                  className={s.contextChipButton}
                  data-testid={`transaction-item-${transaction.id}-refund-chip`}
                >
                  <Badge variant="context">
                    <Undo2 className={s.contextChipIcon} aria-hidden="true" />
                    {refundOfLabel}
                  </Badge>
                </button>
              )}
              {savingsChipLabel && savingsGoalId ? (
                <button
                  type="button"
                  onClick={handleSavingsChipClick}
                  className={s.contextChipButton}
                  data-testid={`transaction-item-${transaction.id}-savings-chip`}
                >
                  <Badge variant="context">
                    <PiggyBank className={s.contextChipIcon} aria-hidden="true" />
                    {savingsChipLabel}
                  </Badge>
                </button>
              ) : (
                savingsChipLabel && (
                  <Badge variant="context">
                    <PiggyBank className={s.contextChipIcon} aria-hidden="true" />
                    {savingsChipLabel}
                  </Badge>
                )
              )}
              {householdExpenseLabel && (
                <Badge variant="context">
                  <Users className={s.contextChipIcon} aria-hidden="true" />
                  {householdExpenseLabel}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <p className={s.date}>{dateFormatter.format(new Date(transaction.date))}</p>

      <p className={cn(s.amount, isReimbursement ? s.reimbursement : isIncome ? s.income : s.expense)}>
        {amountLabel}
      </p>

      <div className={s.actions}>
        {isOwner && (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
