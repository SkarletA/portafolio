import type { ReactNode } from 'react'
import cn from 'clsx'
import s from './Badge.module.css'

interface BadgeProps {
  /** Badge label/content. */
  children: ReactNode
  /** `success` for a positive status, `neutral` for a plain informational tag. */
  variant?: 'success' | 'neutral'
}

/** A small pill-shaped status label. */
export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={cn(s.badge, variant === 'success' ? s.success : s.neutral)}>{children}</span>
}
