import cn from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useListboxNavigation } from './useListboxNavigation'
import s from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  testId: string
  ariaLabel?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  className?: string
}

// A hand-built listbox rather than a native <select> - the browser paints a
// native select's option list with the OS/system palette, not our CSS
// variables, so it's unreadable in dark mode. Follows the same
// trigger-button + own-DOM-panel shape as PreferenceDropdown (click-outside
// and Escape-to-close), plus real keyboard navigation via useListboxNavigation.
export function Select({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  testId,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  className,
}: SelectProps) {
  const {
    open,
    activeIndex,
    selectedIndex,
    wrapperRef,
    triggerRef,
    optionRefs,
    handleTriggerClick,
    handleTriggerKeyDown,
    handlePanelKeyDown,
    handleOptionClick,
  } = useListboxNavigation({ items: options, value, onChange, disabled })

  const panelId = `${testId}-panel`
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined

  return (
    <div ref={wrapperRef} className={cn(s.wrapper, className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={s.trigger}
        data-testid={`${testId}-trigger`}
      >
        <span className={cn(s.value, !selectedOption && s.placeholder)}>
          {selectedOption?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown className={cn(s.chevron, open && s.chevronOpen)} aria-hidden="true" />
      </button>

      {open && (
        <ul id={panelId} role="listbox" aria-label={ariaLabel} className={s.panel} onKeyDown={handlePanelKeyDown}>
          {options.map((option, index) => (
            <li key={option.value} role="presentation">
              <button
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={option.value === value}
                disabled={option.disabled}
                data-value={option.value}
                onClick={handleOptionClick}
                className={cn(
                  s.option,
                  option.value === value && s.optionSelected,
                  index === activeIndex && s.optionActive
                )}
                data-testid={`${testId}-option-${option.value}`}
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
