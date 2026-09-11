import cn from 'clsx'
import type { BudgetWithProgress } from '../../../hooks/useBudgets'
import { CategoryIcon } from '../../atoms/CategoryIcon/CategoryIcon'
import s from './BudgetCard.module.css'

interface BudgetCardProps {
  budget: BudgetWithProgress
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const STATUS_LABELS = {
  'on-track': 'On track',
  'near-limit': 'Near limit',
  exceeded: 'Exceeded',
} as const

export function BudgetCard({ budget }: BudgetCardProps) {
  const { category, monthly_limit: monthlyLimit, spent, percentage, status } = budget
  const categoryName = category?.name ?? 'Uncategorized'
  const fallbackIcon = categoryName[0] || '•'
  const cappedPercentage = Math.min(Math.max(percentage, 0), 100)
  const statusLabel = STATUS_LABELS[status]
  const iconStyle = category?.color ? { backgroundColor: category.color } : undefined

  return (
    <div className={s.card} data-testid="budget-card">
      <div className={s.header}>
        <div className={cn(s.icon, !iconStyle && s.iconFallbackBg)} style={iconStyle}>
          <CategoryIcon name={category?.icon ?? null} fallbackLabel={fallbackIcon} className={s.categoryIcon} />
        </div>
        <div className={s.info}>
          <p className={s.categoryName}>{categoryName}</p>
          <p className={s.amounts}>
            {currencyFormatter.format(spent)} / {currencyFormatter.format(monthlyLimit)}
          </p>
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
        aria-label={`${categoryName} budget: ${statusLabel}`}
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

      <p className={s.percentageLabel}>{Math.round(percentage)}% of monthly limit</p>
    </div>
  )
}
