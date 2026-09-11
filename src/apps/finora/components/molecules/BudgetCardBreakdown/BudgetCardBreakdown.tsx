import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import cn from 'clsx'
import type { BudgetBreakdownItem } from '../../../hooks/useBudgets'
import { CategoryIcon } from '../../atoms/CategoryIcon/CategoryIcon'
import s from './BudgetCardBreakdown.module.css'

interface BudgetCardBreakdownProps {
  categoryId: string
  categoryName: string
  limit: number
  items: BudgetBreakdownItem[]
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function BudgetCardBreakdown({ categoryId, categoryName, limit, items }: BudgetCardBreakdownProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggleClick = useCallback(() => {
    setExpanded((current) => !current)
  }, [])

  if (items.length === 0) return null

  const panelId = `budget-breakdown-${categoryId}`

  return (
    <div className={s.wrapper}>
      <button
        type="button"
        onClick={handleToggleClick}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={s.toggle}
        data-testid={`budget-card-${slugify(categoryName)}-expand-toggle`}
      >
        <span>{expanded ? 'Hide breakdown' : 'Show breakdown'}</span>
        <ChevronDown className={cn(s.chevron, expanded && s.chevronOpen)} aria-hidden="true" />
      </button>

      {expanded && (
        <ul id={panelId} className={s.list}>
          {items.map((item) => {
            const itemPercentage = limit > 0 ? (item.amount / limit) * 100 : 0
            const cappedPercentage = Math.min(Math.max(itemPercentage, 0), 100)
            const iconStyle = item.color ? { backgroundColor: item.color } : undefined

            return (
              <li key={item.category_id} className={s.row}>
                <div className={s.rowHeader}>
                  <div className={cn(s.icon, !iconStyle && s.iconFallbackBg)} style={iconStyle}>
                    <CategoryIcon name={item.icon} fallbackLabel={item.name[0] || '•'} className={s.categoryIcon} />
                  </div>
                  <span className={s.name}>{item.name}</span>
                  <span className={s.amount}>{currencyFormatter.format(item.amount)}</span>
                </div>
                <div
                  className={s.progressTrack}
                  role="progressbar"
                  aria-valuenow={Math.round(cappedPercentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.name}: ${currencyFormatter.format(item.amount)} of ${currencyFormatter.format(limit)} budget`}
                >
                  <div className={s.progressFill} style={{ width: `${cappedPercentage}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
