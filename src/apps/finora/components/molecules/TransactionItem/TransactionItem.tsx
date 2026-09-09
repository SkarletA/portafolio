import cn from 'clsx'
import type { TransactionWithCategory } from '../../../services/transactionsService'
import { Icon, type IconName } from '../../atoms/Icon/Icon'
import s from './TransactionItem.module.css'

interface TransactionItemProps {
  transaction: TransactionWithCategory
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

const ICON_NAMES: IconName[] = ['utensils', 'home', 'car', 'shopping-bag', 'tv']

function isIconName(value: string): value is IconName {
  return (ICON_NAMES as string[]).includes(value)
}

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const amountLabel = `${isIncome ? '+' : '-'}${currencyFormatter.format(Math.abs(transaction.amount))}`
  const iconName = transaction.category?.icon
  const fallbackIcon = transaction.category?.name?.[0] || '•'

  return (
    <div className={s.row}>
      <div className={s.main}>
        <div className={s.icon}>
          {iconName && isIconName(iconName) ? <Icon name={iconName} className={s.categoryIcon} /> : fallbackIcon}
        </div>
        <div className={s.info}>
          <p className={s.description}>{transaction.description}</p>
          <p className={s.meta}>
            {transaction.category?.name ?? 'Uncategorized'}
            {transaction.payment_method ? ` · ${transaction.payment_method}` : ''}
          </p>
        </div>
      </div>

      <p className={s.date}>{dateFormatter.format(new Date(transaction.date))}</p>

      <p className={cn(s.amount, isIncome ? s.income : s.expense)}>{amountLabel}</p>
    </div>
  )
}
