import cn from 'clsx'
import type { TransactionWithCategory } from '../../../services/transactionsService'
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

export function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.type === 'income'
  const amountLabel = `${isIncome ? '+' : '-'}${currencyFormatter.format(Math.abs(transaction.amount))}`
  const iconContent = transaction.category?.icon || transaction.category?.name?.[0] || '•'

  return (
    <div className={s.row}>
      <div className={s.main}>
        <div className={s.icon}>{iconContent}</div>
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
