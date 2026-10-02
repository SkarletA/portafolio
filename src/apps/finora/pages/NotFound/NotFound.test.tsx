import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NotFound } from './NotFound'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn() }
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/does-not-exist']}>
      <NotFound />
    </MemoryRouter>
  )
}

describe('NotFound', () => {
  it('shows a 404 message', () => {
    renderPage()

    expect(screen.getByText('notFound.title')).toBeInTheDocument()
    expect(screen.getByText('notFound.description')).toBeInTheDocument()
  })

  it('navigates back to /finora when the button is clicked', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    renderPage()
    fireEvent.click(screen.getByTestId('not-found-back-button'))

    expect(navigate).toHaveBeenCalledWith('/finora')
  })
})
