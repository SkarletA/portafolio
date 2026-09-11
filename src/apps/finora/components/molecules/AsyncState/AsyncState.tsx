import type { ReactNode } from 'react'
import cn from 'clsx'
import s from './AsyncState.module.css'

interface AsyncStateProps {
  loading: boolean
  error: string | null
  isEmpty: boolean
  loadingLabel: string
  errorMessage: string
  emptyMessage: string
  skeletonCount: number
  skeletonWrapClassName: string
  skeletonItemClassName: string
  boxed?: boolean
  children: ReactNode
}

export function AsyncState({
  loading,
  error,
  isEmpty,
  loadingLabel,
  errorMessage,
  emptyMessage,
  skeletonCount,
  skeletonWrapClassName,
  skeletonItemClassName,
  boxed = false,
  children,
}: AsyncStateProps) {
  if (loading) {
    return (
      <div role="status" aria-live="polite" className={skeletonWrapClassName}>
        <span className={s.srOnly}>{loadingLabel}</span>
        {Array.from({ length: skeletonCount }, (_, index) => (
          <div key={index} className={skeletonItemClassName} />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className={cn(s.errorMessage, boxed && s.boxed)}>{errorMessage}</p>
  }

  if (isEmpty) {
    return <p className={cn(s.stateMessage, boxed && s.boxed)}>{emptyMessage}</p>
  }

  return <>{children}</>
}
