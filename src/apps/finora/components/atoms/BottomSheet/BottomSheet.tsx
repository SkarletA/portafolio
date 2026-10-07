import { useEffect, useRef, type ReactNode } from 'react'
import s from './BottomSheet.module.css'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog; there is no visible title row. */
  ariaLabel: string
  children: ReactNode
  testId?: string
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * A modal sheet anchored to the bottom of the viewport: backdrop, Escape, and
 * a click outside all close it; Tab is trapped inside the panel while it's
 * open, and focus returns to whatever opened it once it closes.
 */
export function BottomSheet({ open, onClose, ariaLabel, children, testId }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedRef.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={s.backdrop} onClick={onClose} data-testid={testId ? `${testId}-backdrop` : undefined}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={s.panel}
        onClick={(event) => event.stopPropagation()}
        data-testid={testId}
      >
        {children}
      </div>
    </div>
  )
}
