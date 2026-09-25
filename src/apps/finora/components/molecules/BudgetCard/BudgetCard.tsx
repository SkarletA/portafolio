import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import type { BudgetWithProgress } from '@hooks/useBudgets'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import s from './BudgetCard.module.css'

interface BudgetCardProps {
  budget: BudgetWithProgress
  /** Removes outer padding, for placing this card flush against a container's own edges. */
  flush?: boolean
}

const STATUS_LABEL_KEYS = {
  'on-track': 'card.status.onTrack',
  'near-limit': 'card.status.nearLimit',
  exceeded: 'card.status.exceeded',
} as const

/** A category's monthly spending progress: amount spent against its limit, with a status badge and progress bar. */
export function BudgetCard({ budget, flush = false }: BudgetCardProps) {
  const { t } = useTranslation(['budgets', 'categories'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
  const { category, monthly_limit: monthlyLimit, effectiveLimit, coveredBySavings, spent, percentage, status } = budget
  const categoryName = category ? getCategoryDisplayName(category, t) : t('card.uncategorized')
  const fallbackIcon = categoryName[0] || '•'
  const cappedPercentage = Math.min(Math.max(percentage, 0), 100)
  const statusLabel = t(STATUS_LABEL_KEYS[status])
  const iconStyle = category?.color ? { backgroundColor: category.color } : undefined
  // A reimbursement widens the effective limit rather than shrinking displayed
  // spend - see docs/adr/002-gross-spend-and-effective-limit.md.
  const reimbursedAmount = effectiveLimit - monthlyLimit
  const hasReimbursement = reimbursedAmount > 0

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
        </div>
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
