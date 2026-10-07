import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import type { RecurringExpenseWithDetails } from '@services/recurringExpensesService'
import { cancelRecurringExpense, postMyRecurringExpenses } from '@services/recurringExpensesService'
import { parseRecurringExpenseError } from '@services/recurringExpensesErrors'
import { getCurrentTerm, getNextTerm, getOverdueDates, getUpcomingCharges, type RecurringSchedule, type RecurringTerm } from '@domain/recurring'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import { Icon } from '@atoms/Icon/Icon'
import s from './RecurringExpenseCard.module.css'

interface RecurringExpenseCardProps {
  recurringExpense: RecurringExpenseWithDetails
  /** The caller's local calendar date (ADR-013) - what "current", "overdue" and "next" mean here. */
  today: string
  /** Called after a cancel or a "post now" that changed the template or posted a charge. */
  onChanged: () => void
}

// Hardcoded 'en-US' like TransactionItem's own date formatting - a formatted
// date value, not static UI copy (see CLAUDE.md's UI Language section).
const cardDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function formatCardDate(date: string): string {
  return cardDateFormatter.format(new Date(`${date}T00:00:00Z`))
}

/**
 * One recurring expense template: its current term, next charge, status, and
 * the actions to edit, cancel, or publish an overdue charge now. Mirrors
 * BudgetCard's confirm-before-destructive-action pattern for cancel.
 */
export function RecurringExpenseCard({ recurringExpense, today, onChanged }: RecurringExpenseCardProps) {
  const { t } = useTranslation(['recurring', 'categories', 'common'])
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const { id, ended_on: endedOn, last_error: lastError, terms, occurrences } = recurringExpense

  const schedule: RecurringSchedule = useMemo(
    () => ({ startOn: recurringExpense.start_on, endedOn, dayOfMonth: recurringExpense.day_of_month }),
    [recurringExpense.start_on, endedOn, recurringExpense.day_of_month]
  )

  const scheduleTerms: RecurringTerm[] = useMemo(
    () =>
      terms.map((term) => ({
        effectiveFrom: term.effective_from,
        description: term.description,
        amount: term.amount,
        categoryId: term.category_id,
        paymentMethod: term.payment_method,
      })),
    [terms]
  )

  const currentTerm = useMemo(() => getCurrentTerm(scheduleTerms, today), [scheduleTerms, today])
  const currentTermRow = terms.find((term) => term.effective_from === currentTerm?.effectiveFrom) ?? terms[0]
  const nextCharge = useMemo(() => getUpcomingCharges(schedule, scheduleTerms, today, 1)[0] ?? null, [schedule, scheduleTerms, today])

  // A price change an edit scheduled for later, invisible otherwise once the
  // form closes (AddRecurringExpense only shows it while editing). Null in
  // the common case of no pending change.
  const nextTerm = useMemo(() => getNextTerm(scheduleTerms, currentTerm), [scheduleTerms, currentTerm])
  const nextTermChargeDate = useMemo(() => {
    if (!nextTerm) return null
    return getUpcomingCharges(schedule, [nextTerm], nextTerm.effectiveFrom, 1)[0]?.date ?? null
  }, [schedule, nextTerm])

  const postedDates = useMemo(
    () => occurrences.filter((occurrence) => occurrence.transaction_id).map((occurrence) => occurrence.scheduled_date),
    [occurrences]
  )
  const overdueDates = useMemo(() => getOverdueDates(schedule, postedDates, today), [schedule, postedDates, today])
  const isOverdue = overdueDates.length > 0

  // Matches update_recurring_expense and cancel_recurring_expense (recurring_ended):
  // any ended_on, even a future one, means the template can't be edited or cancelled again.
  const isEnded = endedOn !== null
  const isFullyStopped = isEnded && endedOn! < today

  const categoryName = currentTermRow?.category ? getCategoryDisplayName(currentTermRow.category, t) : t('card.uncategorized')
  const fallbackIcon = categoryName[0] || '•'
  const iconStyle = currentTermRow?.category?.color ? { backgroundColor: currentTermRow.category.color } : undefined

  const statusLabel = isFullyStopped
    ? t('card.status.cancelled', { date: formatCardDate(endedOn!) })
    : isEnded
      ? t('card.status.ending', { date: formatCardDate(endedOn!) })
      : t('card.status.active')

  const handleEditClick = useCallback(() => {
    navigate(`/finora/recurring/${id}/edit`)
  }, [navigate, id])

  const handleCancelIconClick = useCallback(() => {
    setIsConfirmingCancel(true)
  }, [])

  const handleDismissCancel = useCallback(() => {
    setIsConfirmingCancel(false)
    setCancelError(null)
  }, [])

  const handleConfirmCancel = useCallback(async () => {
    setCancelling(true)
    setCancelError(null)

    const { error } = await cancelRecurringExpense(id, today, today)

    setCancelling(false)

    if (error) {
      const code = parseRecurringExpenseError(error)
      setCancelError(code ? t(`recurring:errors.${code}`) : error.message)
      return
    }

    setIsConfirmingCancel(false)
    onChanged()
  }, [id, today, onChanged, t])

  const handlePostNowClick = useCallback(async () => {
    setPosting(true)
    setPostError(null)

    const { error } = await postMyRecurringExpenses(today)

    setPosting(false)

    if (error) {
      const code = parseRecurringExpenseError(error)
      setPostError(code ? t(`recurring:errors.${code}`) : error.message)
      return
    }

    onChanged()
  }, [today, onChanged, t])

  if (isConfirmingCancel) {
    return (
      <div className={cn(s.card, s.cancelConfirmCard)} data-testid={`recurring-card-${id}`}>
        <span className={s.cancelConfirmText}>
          {t('card.confirmCancel', { description: currentTerm?.description ?? '' })}
        </span>
        <div className={s.cancelConfirmActions}>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            className={s.cancelConfirmButton}
            data-testid={`recurring-card-${id}-confirm-cancel-button`}
          >
            {cancelling ? t('common:buttons.updating') : t('common:buttons.confirm')}
          </button>
          <button
            type="button"
            onClick={handleDismissCancel}
            disabled={cancelling}
            className={s.cancelDismissButton}
            data-testid={`recurring-card-${id}-dismiss-cancel-button`}
          >
            {t('common:buttons.cancel')}
          </button>
        </div>
        {cancelError && (
          <p role="alert" className={s.error}>
            {cancelError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={s.card} data-testid={`recurring-card-${id}`}>
      <div className={s.header}>
        <div className={cn(s.icon, !iconStyle && s.iconFallbackBg)} style={iconStyle}>
          <CategoryIcon name={currentTermRow?.category?.icon ?? null} fallbackLabel={fallbackIcon} className={s.categoryIcon} />
        </div>
        <div className={s.info}>
          <p className={s.description}>{currentTerm?.description}</p>
          <p className={s.amount}>
            {formatCurrency(currentTerm?.amount ?? 0, currency, locale)} · {categoryName}
          </p>
          {nextCharge && !isFullyStopped && (
            <p className={s.nextCharge}>{t('card.nextCharge', { date: formatCardDate(nextCharge.date) })}</p>
          )}
          {nextTerm && nextTermChargeDate && !isFullyStopped && (
            <p className={s.priceChangeHint} data-testid={`recurring-card-${id}-price-change-hint`}>
              {t('card.priceChangeHint', {
                amount: formatCurrency(nextTerm.amount, currency, locale),
                date: formatCardDate(nextTermChargeDate),
              })}
            </p>
          )}
        </div>
        <div className={s.headerEnd}>
          <span className={cn(s.statusBadge, isFullyStopped ? s.statusCancelled : isEnded ? s.statusEnding : s.statusActive)}>
            {statusLabel}
          </span>
          {!isEnded && (
            <div className={s.actions}>
              <button
                type="button"
                onClick={handleEditClick}
                aria-label={t('card.editAriaLabel', { description: currentTerm?.description ?? '' })}
                className={s.actionIcon}
                data-testid={`recurring-card-${id}-edit-icon`}
              >
                <Icon name="edit" className={s.actionIconGlyph} />
              </button>
              <button
                type="button"
                onClick={handleCancelIconClick}
                aria-label={t('card.cancelAriaLabel', { description: currentTerm?.description ?? '' })}
                className={s.actionIcon}
                data-testid={`recurring-card-${id}-cancel-icon`}
              >
                <Icon name="trash" className={s.actionIconGlyph} />
              </button>
            </div>
          )}
        </div>
      </div>

      {isOverdue && (
        <div className={s.overdueBanner} data-testid={`recurring-card-${id}-overdue-banner`}>
          <p className={s.overdueText}>{t('card.overdueHint', { count: overdueDates.length })}</p>
          <button
            type="button"
            onClick={handlePostNowClick}
            disabled={posting}
            className={s.postNowButton}
            data-testid={`recurring-card-${id}-post-now-button`}
          >
            {posting ? t('card.posting') : t('card.postNow')}
          </button>
        </div>
      )}

      {postError && (
        <p role="alert" className={s.error}>
          {postError}
        </p>
      )}

      {lastError && <p className={s.lastErrorHint}>{t('card.lastErrorHint')}</p>}
    </div>
  )
}
