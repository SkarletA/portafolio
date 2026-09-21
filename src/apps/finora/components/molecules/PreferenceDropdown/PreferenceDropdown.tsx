import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import cn from 'clsx'
import { ChevronDown } from 'lucide-react'
import s from './PreferenceDropdown.module.css'

export interface PreferenceDropdownOption {
  value: string
  label: string
}

interface PreferenceDropdownProps {
  icon: ReactNode
  label: string
  value: string
  options: PreferenceDropdownOption[]
  onSelect: (value: string) => void
  testId: string
}

export function PreferenceDropdown({ icon, label, value, options, onSelect, testId }: PreferenceDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const panelId = `${testId}-panel`

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleToggleClick = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const handleOptionClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const nextValue = event.currentTarget.dataset.value
      if (nextValue) {
        onSelect(nextValue)
        setOpen(false)
      }
    },
    [onSelect]
  )

  const selectedOption = options.find((option) => option.value === value)

  return (
    <div ref={wrapperRef} className={s.wrapper}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleToggleClick}
        className={s.trigger}
        data-testid={`${testId}-toggle`}
      >
        {icon}
        <span className={s.label}>{label}</span>
        <span className={s.value}>{selectedOption?.label ?? value}</span>
        <ChevronDown className={cn(s.chevron, open && s.chevronOpen)} aria-hidden="true" />
      </button>

      {open && (
        <ul id={panelId} role="listbox" aria-label={label} className={s.panel}>
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                data-value={option.value}
                onClick={handleOptionClick}
                className={cn(s.option, option.value === value && s.optionSelected)}
                data-testid={`${testId}-option-${option.value.toLowerCase()}`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
