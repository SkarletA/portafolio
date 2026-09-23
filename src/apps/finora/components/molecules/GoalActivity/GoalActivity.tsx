import { useCallback, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import { Icon } from '@atoms/Icon/Icon'
import type { GoalTransferWithTransaction } from '@services/goalsService'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import s from './GoalActivity.module.css'

interface GoalActivityProps {
  /** Used for the list's accessible name. */
  goalName: string
  /** Newest first. */
  transfers: GoalTransferWithTransaction[]
  loading: boolean
  error: string | null
  /** The deposit currently being deleted, if any. */
  deletingId: string | null
  deleteError: string | null
  onDeleteDeposit: (transferId: string) => void
}

/**
 * The money that moved into and out of a Goal: what was already saved, each
 * deposit, and each withdrawal with a link to the expense it covered. Only
 * deposits can be deleted.
 */
export function GoalActivity({
  goalName,
  transfers,
  loading,
  error,
  deletingId,
  deleteError,
  onDeleteDeposit,
}: GoalActivityProps) {
  const { t } = useTranslation('goals')
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const handleDeleteClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const transferId = event.currentTarget.dataset.transferId
      if (transferId) onDeleteDeposit(transferId)
    },
    [onDeleteDeposit]
  )

  if (loading && transfers.length === 0) {
    return <p className={s.state}>{t('activity.loading')}</p>
  }
  if (error) {
    return (
      <p role="alert" className={s.error}>
        {t('activity.error')}
      </p>
    )
  }
  if (transfers.length === 0) {
    return <p className={s.state}>{t('activity.empty')}</p>
  }

  return (
    <div className={s.activity}>
      <ul className={s.list} aria-label={t('activity.listAriaLabel', { name: goalName })}>
        {transfers.map((transfer) => {
          const isWithdrawal = transfer.kind === 'withdrawal'
          const amount = formatCurrency(transfer.amount, currency, locale)
          const date = dateFormatter.format(new Date(`${transfer.date}T00:00:00Z`))

          return (
            <li key={transfer.id} className={s.item}>
              <div className={s.info}>
                {isWithdrawal && transfer.transaction ? (
                  <Link
                    to={`/finora/transactions/${transfer.transaction.id}/edit`}
                    className={s.link}
                    data-testid={`goal-activity-transfer-${transfer.id}-expense-link`}
                  >
                    {t('activity.withdrawal', { description: transfer.transaction.description })}
                  </Link>
                ) : (
                  <span className={s.label}>{t(`activity.kind.${transfer.kind}`)}</span>
                )}
                <span className={s.date}>{date}</span>
              </div>
              <span className={cn(s.amount, isWithdrawal ? s.amountOut : s.amountIn)}>
                {isWithdrawal ? '−' : '+'}
                {amount}
              </span>
              {transfer.kind === 'deposit' && (
                <button
                  type="button"
                  data-transfer-id={transfer.id}
                  onClick={handleDeleteClick}
                  disabled={deletingId !== null}
                  aria-label={t('activity.deleteDepositAriaLabel', { amount, date })}
                  className={s.deleteIcon}
                  data-testid={`goal-activity-transfer-${transfer.id}-delete-icon`}
                >
                  <Icon name="trash" className={s.deleteIconGlyph} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {deleteError && (
        <p role="alert" className={s.error}>
          {deleteError}
        </p>
      )}
    </div>
  )
}
