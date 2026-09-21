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
  value: string
  label: string
  disabled?: boolean
  children: GroupedSelectOption[]
}

export interface GroupedSelectSpecialOption {
  value: string
  label: string
}

export interface GroupedSelectProps {
  groups: GroupedSelectGroup[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  testId: string
  ariaLabel?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  // Rendered at the end of the panel, below a separator with a "+" icon -
  // e.g. "Create new category". Distinct from a group: it has no children
  // and is never rendered as a header.
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

// Same listbox mechanics as Select, but each group's own value is itself a
// selectable option styled as a header, with its children indented below -
// a category can be budgeted/assigned directly (e.g. "Food") or via one of
// its subcategories (e.g. "Food > Meat"), so the parent can't be a
// non-selectable label the way a native <optgroup> heading is. A group with
// no children simply has nothing indented under its header - no separate
// "collapsed" state to manage.
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
