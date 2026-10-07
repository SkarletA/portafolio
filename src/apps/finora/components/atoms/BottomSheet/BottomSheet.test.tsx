import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BottomSheet } from './BottomSheet'

describe('BottomSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <BottomSheet open={false} onClose={vi.fn()} ariaLabel="More options" testId="sheet">
        <p>Content</p>
      </BottomSheet>
    )

    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument()
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders the panel as a labeled dialog when open', () => {
    render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="More options" testId="sheet">
        <p>Content</p>
      </BottomSheet>
    )

    const dialog = screen.getByRole('dialog', { name: 'More options' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} ariaLabel="More options" testId="sheet">
        <p>Content</p>
      </BottomSheet>
    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose on a backdrop click, but not on a click inside the panel', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet open onClose={onClose} ariaLabel="More options" testId="sheet">
        <button type="button">Row</button>
      </BottomSheet>
    )

    fireEvent.click(screen.getByText('Row'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('sheet-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })

  it('traps Tab inside the panel, wrapping from the last row back to the first', () => {
    render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="More options" testId="sheet">
        <button type="button">First</button>
        <button type="button">Last</button>
      </BottomSheet>
    )

    const first = screen.getByText('First')
    const last = screen.getByText('Last')

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('returns focus to whatever opened it once closed', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(
      <BottomSheet open onClose={vi.fn()} ariaLabel="More options" testId="sheet">
        <button type="button">Row</button>
      </BottomSheet>
    )

    rerender(
      <BottomSheet open={false} onClose={vi.fn()} ariaLabel="More options" testId="sheet">
        <button type="button">Row</button>
      </BottomSheet>
    )

    expect(document.activeElement).toBe(trigger)
    document.body.removeChild(trigger)
  })
})
