import type { ReactNode } from 'react'
import cn from 'clsx'
import s from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'neutral'
}

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={cn(s.badge, variant === 'success' ? s.success : s.neutral)}>{children}</span>
}
