import { Fragment, useMemo } from 'react'
import cn from 'clsx'
import { ChevronDown, Plus } from 'lucide-react'
import { useListboxNavigation } from './useListboxNavigation'
import s from './Select.module.css'

export interface GroupedSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface GroupedSelectGroup {
  /** The group's own value - it's directly selectable, not just a heading. */
  value: string
  label: string
  /** Shown but not selectable - e.g. a category that's already in use elsewhere. */
  disabled?: boolean
  /** Indented options shown under this group's header. */
  children: GroupedSelectOption[]
}

export interface GroupedSelectSpecialOption {
  value: string
  label: string
}

export interface GroupedSelectProps {
  groups: GroupedSelectGroup[]
  /** The currently selected value (a group's own value or one of its children's), or `''` for no selection. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  testId: string
  ariaLabel?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  /** Rendered at the end of the panel, below a separator with a "+" icon - e.g. "Create new category". */
  specialOption?: GroupedSelectSpecialOption
  className?: string
}

type FlatKind = 'header' | 'child' | 'special'

interface FlatItem {
  value: string
  label: string
  disabled?: boolean
  kind: FlatKind
}

/**
 * A dropdown list of options organized into labeled groups, with each
 * group's own value directly selectable alongside its indented children -
 * e.g. picking "Food" itself or one of its subcategories like "Food > Meat"
 * from the same list. Otherwise the same as Select: legible in both themes,
 * with arrow-key navigation, Enter to select, and Escape to close.
 */
export function GroupedSelect({
  groups,
  value,
  onChange,
  placeholder,
  disabled = false,
  testId,
  ariaLabel,
  ariaInvalid,
  ariaDescribedBy,
  specialOption,
  className,
}: GroupedSelectProps) {
  const flatItems = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = []

    for (const group of groups) {
      items.push({ value: group.value, label: group.label, disabled: group.disabled, kind: 'header' })
      for (const child of group.children) {
        items.push({ value: child.value, label: child.label, disabled: child.disabled, kind: 'child' })
      }
    }

    if (specialOption) {
      items.push({ value: specialOption.value, label: specialOption.label, kind: 'special' })
    }

    return items
  }, [groups, specialOption])

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
  } = useListboxNavigation({ items: flatItems, value, onChange, disabled })

  const panelId = `${testId}-panel`
  const selectedItem = selectedIndex >= 0 ? flatItems[selectedIndex] : undefined

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
        <span className={cn(s.value, !selectedItem && s.placeholder)}>
          {selectedItem?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown className={cn(s.chevron, open && s.chevronOpen)} aria-hidden="true" />
      </button>

      {open && (
        <ul id={panelId} role="listbox" aria-label={ariaLabel} className={s.panel} onKeyDown={handlePanelKeyDown}>
          {flatItems.map((item, index) => (
            <Fragment key={item.value}>
              {item.kind === 'special' && <li role="separator" className={s.separator} />}
              <li role="presentation">
                <button
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  aria-selected={item.value === value}
                  disabled={item.disabled}
                  data-value={item.value}
                  onClick={handleOptionClick}
                  className={cn(
                    s.option,
                    item.kind === 'header' && s.optionHeader,
                    item.kind === 'child' && s.optionChild,
                    item.kind === 'special' && s.optionSpecial,
                    item.value === value && s.optionSelected,
                    index === activeIndex && s.optionActive
                  )}
                  data-testid={`${testId}-option-${item.value}`}
                >
                  {item.kind === 'special' && <Plus className={s.specialIcon} aria-hidden="true" />}
                  {item.label}
                </button>
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  )
}
