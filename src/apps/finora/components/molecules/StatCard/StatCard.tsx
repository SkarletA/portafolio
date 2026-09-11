import cn from 'clsx'
import s from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: string
  testId: string
  variant?: 'default' | 'success' | 'danger'
}

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
