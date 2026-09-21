import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'

export interface ListboxItem {
  value: string
  disabled?: boolean
}

interface UseListboxNavigationArgs<Item extends ListboxItem> {
  items: Item[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

// Shared open/close + keyboard-navigation behavior for Select and
// GroupedSelect - both are a trigger button + our own DOM options panel
// (never a native <select>, since a browser paints a native select's option
// list with the OS palette, not our theme variables, which is unreadable in
// dark mode). Every option button is programmatically focusable but not
// Tab-reachable (tabIndex -1 in the caller's markup): arrow keys move real
// DOM focus between them here, and Tab always exits the whole control in one
// jump, same as a native <select>.
export function useListboxNavigation<Item extends ListboxItem>({
  items,
  value,
  onChange,
  disabled = false,
}: UseListboxNavigationArgs<Item>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const selectedIndex = items.findIndex((item) => item.value === value)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus()
    }
  }, [open, activeIndex])

  const findEnabledIndex = useCallback(
    (start: number, direction: 1 | -1): number => {
      let index = start
      while (index >= 0 && index < items.length) {
        if (!items[index].disabled) return index
        index += direction
      }
      return start
    },
    [items]
  )

  const openPanel = useCallback(
    (initialIndex: number) => {
      setOpen(true)
      setActiveIndex(findEnabledIndex(initialIndex, initialIndex === items.length - 1 ? -1 : 1))
    },
    [findEnabledIndex, items.length]
  )

  const closePanel = useCallback((refocusTrigger: boolean) => {
    setOpen(false)
    setActiveIndex(-1)
    if (refocusTrigger) triggerRef.current?.focus()
  }, [])

  const handleTriggerClick = useCallback(() => {
    if (disabled) return
    if (open) {
      closePanel(false)
    } else {
      openPanel(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [disabled, open, closePanel, openPanel, selectedIndex])

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || open) return

      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openPanel(selectedIndex >= 0 ? selectedIndex : 0)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        openPanel(selectedIndex >= 0 ? selectedIndex : items.length - 1)
      }
    },
    [disabled, open, openPanel, selectedIndex, items.length]
  )

  const selectActive = useCallback(() => {
    const item = items[activeIndex]
    if (item && !item.disabled) {
      onChange(item.value)
      closePanel(true)
    }
  }, [items, activeIndex, onChange, closePanel])

  const handlePanelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLUListElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => findEnabledIndex(Math.min(current + 1, items.length - 1), -1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => findEnabledIndex(Math.max(current - 1, 0), 1))
      } else if (event.key === 'Home') {
        event.preventDefault()
        setActiveIndex(findEnabledIndex(0, 1))
      } else if (event.key === 'End') {
        event.preventDefault()
        setActiveIndex(findEnabledIndex(items.length - 1, -1))
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectActive()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        closePanel(true)
      } else if (event.key === 'Tab') {
        closePanel(false)
      }
    },
    [items.length, findEnabledIndex, selectActive, closePanel]
  )

  const handleOptionClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      const clickedValue = event.currentTarget.dataset.value
      const item = items.find((candidate) => candidate.value === clickedValue)
      if (item && !item.disabled) {
        onChange(item.value)
        closePanel(true)
      }
    },
    [items, onChange, closePanel]
  )

  return {
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
  }
}
