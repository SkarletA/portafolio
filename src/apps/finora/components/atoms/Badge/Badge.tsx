import type { ReactNode } from 'react'
import cn from 'clsx'
import s from './Badge.module.css'

interface BadgeProps {
  /** Badge label/content. */
  children: ReactNode
  /**
   * `success` for a positive status, `neutral` for a plain informational tag,
   * `shared` for a household expense split's per-person amount
   * (docs/adr/009-shared-expense-split.md), `context` for a single-line
   * informational tag with no money split (TransactionItem's gray chips -
   * see the comment above its CONTEXT_CHIP section for the blue/gray rule).
   */
  variant?: 'success' | 'neutral' | 'shared' | 'context'
}

const VARIANT_CLASS = { success: 'success', neutral: 'neutral', shared: 'shared', context: 'context' } as const

/** A small pill-shaped status label. */
export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return <span className={cn(s.badge, s[VARIANT_CLASS[variant]])}>{children}</span>
}
