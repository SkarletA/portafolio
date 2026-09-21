import type { ReactNode } from 'react'
import cn from 'clsx'
import s from './AsyncState.module.css'

interface AsyncStateProps {
  loading: boolean
  /** A message to show instead of the content; `null` means no error. */
  error: string | null
  /** Whether the loaded data has nothing to show. */
  isEmpty: boolean
  /** Announced to screen readers while loading. */
  loadingLabel: string
  errorMessage: string
  emptyMessage: string
  /** How many skeleton placeholders to render while loading. */
  skeletonCount: number
  /** Class for the element wrapping all the skeleton placeholders. */
  skeletonWrapClassName: string
  /** Class for each individual skeleton placeholder. */
  skeletonItemClassName: string
  /** Adds a bordered card look around the error/empty message. */
  boxed?: boolean
  /** The real content, rendered once loading has finished without error and there's data to show. */
  children: ReactNode
}

/** Swaps between a loading skeleton, an error message, an empty-state message, and the real content. */
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
