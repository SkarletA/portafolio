import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import type { BudgetWithProgress } from '@hooks/useBudgets'
import { deleteBudget } from '@services/budgetsService'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { getHouseholdPartnerDisplayName } from '@domain/household'
import { subtractMoney } from '@domain/money'
import { useAuth } from '@context/AuthContext'
import { useCurrency } from '@context/CurrencyContext'
import { useHousehold } from '@context/HouseholdContext'
import { useLanguage } from '@context/LanguageContext'
import { Badge } from '@atoms/Badge/Badge'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import { Icon } from '@atoms/Icon/Icon'
import s from './BudgetCard.module.css'

interface BudgetCardProps {
  budget: BudgetWithProgress
  /** Removes outer padding, for placing this card flush against a container's own edges. */
  flush?: boolean
  /** Called after a successful delete, so the caller can refresh its list. */
  onDeleted?: () => void
}

const STATUS_LABEL_KEYS = {
  'on-track': 'card.status.onTrack',
  'near-limit': 'card.status.nearLimit',
  exceeded: 'card.status.exceeded',
} as const

/** A category's monthly spending progress: amount spent against its limit, with a status badge and progress bar. */
export function BudgetCard({ budget, flush = false, onDeleted }: BudgetCardProps) {
  const { t } = useTranslation(['budgets', 'categories', 'common'])
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const { user } = useAuth()
  const { partner } = useHousehold()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const locale = getLocaleForLanguage(language)
  const partnerName = getHouseholdPartnerDisplayName(partner)
  const {
    category,
    monthly_limit: monthlyLimit,
    effectiveLimit,
    coveredBySavings,
    spent,
    percentage,
    status,
    householdContributions,
  } = budget
  const categoryName = category ? getCategoryDisplayName(category, t) : t('card.uncategorized')
  const fallbackIcon = categoryName[0] || '•'
  const cappedPercentage = Math.min(Math.max(percentage, 0), 100)
  const statusLabel = t(STATUS_LABEL_KEYS[status])
  const iconStyle = category?.color ? { backgroundColor: category.color } : undefined
  // A reimbursement widens the effective limit rather than shrinking displayed
  // spend - see docs/adr/002-gross-spend-and-effective-limit.md.
  const reimbursedAmount = subtractMoney(effectiveLimit, monthlyLimit)
  const hasReimbursement = reimbursedAmount > 0

  // useBudgets() also returns my household partner's is_household budgets
  // (ADR-010), listed here for visibility only - only the owner may edit or
  // delete a budget, household or personal, matching the write-only-by-owner
  // RLS policies (household_foundations.sql) and TransactionItem's same guard.
  const isOwner = budget.user_id === user?.id

  const handleEditClick = useCallback(() => {
    navigate(`/finora/budgets/${budget.id}/edit`)
  }, [navigate, budget.id])

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

    const { error } = await deleteBudget(budget.id)

    setDeleting(false)

    if (error) {
      setDeleteError(error.message)
      return
    }

    onDeleted?.()
  }, [budget.id, onDeleted])

  if (isConfirmingDelete) {
    return (
      <div className={cn(s.card, flush && s.cardFlush, s.deleteConfirmCard)} data-testid="budget-card">
        <span className={s.deleteConfirmText}>{t('card.confirmDelete', { category: categoryName })}</span>
        <div className={s.deleteConfirmActions}>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleting}
            className={s.deleteConfirmButton}
            data-testid={`budget-card-${budget.id}-confirm-delete-button`}
          >
            {deleting ? t('common:buttons.deleting') : t('common:buttons.delete')}
          </button>
          <button
            type="button"
            onClick={handleCancelDelete}
            disabled={deleting}
            className={s.deleteCancelButton}
            data-testid={`budget-card-${budget.id}-cancel-delete-button`}
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
    <div className={cn(s.card, flush && s.cardFlush)} data-testid="budget-card">
      <div className={s.header}>
        <div className={cn(s.icon, !iconStyle && s.iconFallbackBg)} style={iconStyle}>
          <CategoryIcon name={category?.icon ?? null} fallbackLabel={fallbackIcon} className={s.categoryIcon} />
        </div>
        <div className={s.info}>
          <p className={s.categoryName}>{categoryName}</p>
          <p className={s.amounts}>
            {formatCurrency(spent, currency, locale)} /{' '}
            {formatCurrency(effectiveLimit, currency, locale)}
          </p>
          {hasReimbursement && (
            <p className={s.reimbursedHint}>
              {t('card.reimbursedHint', {
                amount: formatCurrency(reimbursedAmount, currency, locale),
              })}
            </p>
          )}
          {coveredBySavings > 0 && (
            <p className={s.savingsHint}>
              {t('card.coveredBySavingsHint', {
                amount: formatCurrency(coveredBySavings, currency, locale),
              })}
            </p>
          )}
          {householdContributions && (
            <div className={s.householdChips}>
              <Badge variant="shared">
                {t('card.contributionYou', {
                  amount: formatCurrency(householdContributions.own, currency, locale),
                })}
              </Badge>
              <Badge variant="shared">
                {t('card.contributionOther', {
                  name: partnerName ?? '',
                  amount: formatCurrency(householdContributions.partner, currency, locale),
                })}
              </Badge>
            </div>
          )}
        </div>
        <div className={s.headerEnd}>
          <span
            className={cn(
              s.statusBadge,
              status === 'on-track' && s.statusOnTrack,
              status === 'near-limit' && s.statusNearLimit,
              status === 'exceeded' && s.statusExceeded
            )}
          >
            {statusLabel}
          </span>
          {isOwner && (
            <div className={s.actions}>
              <button
                type="button"
                onClick={handleEditClick}
                aria-label={t('card.editAriaLabel', { category: categoryName })}
                className={s.actionIcon}
                data-testid={`budget-card-${budget.id}-edit-icon`}
              >
                <Icon name="edit" className={s.actionIconGlyph} />
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                aria-label={t('card.deleteAriaLabel', { category: categoryName })}
                className={s.actionIcon}
                data-testid={`budget-card-${budget.id}-delete-icon`}
              >
                <Icon name="trash" className={s.actionIconGlyph} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className={s.progressTrack}
        role="progressbar"
        aria-valuenow={cappedPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('card.progressAriaLabel', { category: categoryName, status: statusLabel })}
      >
        <div
          className={cn(
            s.progressFill,
            status === 'on-track' && s.fillOnTrack,
            status === 'near-limit' && s.fillNearLimit,
            status === 'exceeded' && s.fillExceeded
          )}
          style={{ width: `${cappedPercentage}%` }}
        />
      </div>

      <p className={s.percentageLabel}>{t('card.percentageLabel', { percent: Math.round(percentage) })}</p>
    </div>
  )
}
