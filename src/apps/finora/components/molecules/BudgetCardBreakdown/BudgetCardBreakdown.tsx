import { useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import type { BudgetBreakdownItem } from '@hooks/useBudgets'
import { getCategoryDisplayName } from '@domain/category'
import { formatCurrency, getLocaleForLanguage } from '@domain/currency'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import { CategoryIcon } from '@atoms/CategoryIcon/CategoryIcon'
import s from './BudgetCardBreakdown.module.css'

interface BudgetCardBreakdownProps {
  /** Used to build a stable, unique id/testid for the show/hide toggle. */
  categoryId: string
  categoryName: string
  /** The parent category's effective monthly limit, used to size each subcategory's mini progress bar. */
  limit: number
  /** Subcategories to list once expanded; renders nothing when empty. */
  items: BudgetBreakdownItem[]
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** A collapsible list of subcategory spend under a budget card, hidden until the user asks to see it. */
export function BudgetCardBreakdown({ categoryId, categoryName, limit, items }: BudgetCardBreakdownProps) {
  const { t } = useTranslation(['budgets', 'categories'])
  const { currency } = useCurrency()
  const { language } = useLanguage()
  const locale = getLocaleForLanguage(language)
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
        <span>{expanded ? t('breakdown.hide') : t('breakdown.show')}</span>
        <ChevronDown className={cn(s.chevron, expanded && s.chevronOpen)} aria-hidden="true" />
      </button>

      {expanded && (
        <ul id={panelId} className={s.list}>
          {items.map((item) => {
            const itemPercentage = limit > 0 ? (item.amount / limit) * 100 : 0
            const cappedPercentage = Math.min(Math.max(itemPercentage, 0), 100)
            const iconStyle = item.color ? { backgroundColor: item.color } : undefined
            const itemDisplayName = getCategoryDisplayName(item, t)

            return (
              <li key={item.category_id} className={s.row}>
                <div className={s.rowHeader}>
                  <div className={cn(s.icon, !iconStyle && s.iconFallbackBg)} style={iconStyle}>
                    <CategoryIcon name={item.icon} fallbackLabel={itemDisplayName[0] || '•'} className={s.categoryIcon} />
                  </div>
                  <span className={s.name}>{itemDisplayName}</span>
                  <span className={s.amount}>
                    {formatCurrency(item.amount, currency, locale)}
                  </span>
                </div>
                <div
                  className={s.progressTrack}
                  role="progressbar"
                  aria-valuenow={Math.round(cappedPercentage)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('breakdown.progressAriaLabel', {
                    name: itemDisplayName,
                    spent: formatCurrency(item.amount, currency, locale),
                    limit: formatCurrency(limit, currency, locale),
                  })}
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
