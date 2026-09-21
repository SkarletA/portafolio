import cn from 'clsx'
import s from './StatCard.module.css'

interface StatCardProps {
  label: string
  /** Pre-formatted display value, e.g. an already currency-formatted amount or a percentage string. */
  value: string
  testId: string
  /** Colors the value green/red for a positive/negative figure; `default` is neutral. */
  variant?: 'default' | 'success' | 'danger'
}

/** A single labeled figure, e.g. an amount or percentage, shown in a small card. */
export function StatCard({ label, value, testId, variant = 'default' }: StatCardProps) {
  return (
    <div className={s.card} data-testid={testId}>
      <p className={s.label}>{label}</p>
      <p
        className={cn(
          s.value,
          variant === 'success' && s.valueSuccess,
          variant === 'danger' && s.valueDanger
        )}
      >
        {value}
      </p>
    </div>
  )
}
