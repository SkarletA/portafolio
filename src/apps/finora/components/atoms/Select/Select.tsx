import cn from 'clsx'
import { ChevronDown } from 'lucide-react'
import { useListboxNavigation } from './useListboxNavigation'
import s from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
  /** Shown but not selectable. */
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  /** The currently selected option's value, or `''` for no selection. */
  value: string
  onChange: (value: string) => void
  /** Shown in place of a label when nothing is selected yet. */
  placeholder?: string
  disabled?: boolean
  /** Base for this instance's `data-testid`s: `{testId}-trigger` and `{testId}-option-{value}`. */
  testId: string
  /** Accessible name for the trigger and the options panel, for fields with no visible `<label>`. */
  ariaLabel?: string
  ariaInvalid?: boolean
  /** Id of an element (e.g. a validation message) that describes this field. */
  ariaDescribedBy?: string
  className?: string
}

/**
 * A dropdown list of options to choose one from, styled to match the rest of
 * Finora's inputs and legible in both light and dark mode - unlike a native
 * `<select>`, whose option list the browser paints with the OS palette
 * regardless of page theme. Supports arrow-key navigation, Enter to select,
 * and Escape to close.
 */
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
