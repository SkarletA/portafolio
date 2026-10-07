import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MoreNav } from './MoreNav'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MoreNav />
      <Routes>
        <Route path="/finora/goals" element={<p>Goals page</p>} />
        <Route path="/finora/recurring" element={<p>Recurring page</p>} />
        <Route path="/finora/settings" element={<p>Settings page</p>} />
        <Route path="*" element={<p>Other page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MoreNav', () => {
  it('starts closed and inactive away from its three destinations', () => {
    renderAt('/finora')

    expect(screen.getByTestId('mobile-more-button')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is active when the current route is one of its destinations, even with the sheet closed', () => {
    renderAt('/finora/goals')

    const button = screen.getByTestId('mobile-more-button')
    expect(button.className).toContain('active')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the sheet with the three rows and marks the button active and expanded', () => {
    renderAt('/finora')

    fireEvent.click(screen.getByTestId('mobile-more-button'))

    expect(screen.getByTestId('mobile-more-button')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('mobile-more-button').className).toContain('active')
    expect(screen.getByTestId('mobile-more-row-goals')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-more-row-recurring')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-more-row-settings')).toBeInTheDocument()
  })

  it('navigates and closes the sheet when a row is chosen', () => {
    renderAt('/finora')

    fireEvent.click(screen.getByTestId('mobile-more-button'))
    fireEvent.click(screen.getByTestId('mobile-more-row-recurring'))

    expect(screen.getByText('Recurring page')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape and returns focus to the More button', () => {
    renderAt('/finora')

    const button = screen.getByTestId('mobile-more-button')
    button.focus()
    fireEvent.click(button)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(button)
  })

  it('closes on a backdrop click', () => {
    renderAt('/finora')

    fireEvent.click(screen.getByTestId('mobile-more-button'))
    fireEvent.click(screen.getByTestId('mobile-more-sheet-backdrop'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
