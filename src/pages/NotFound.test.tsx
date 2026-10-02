import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFound } from './NotFound'

describe('NotFound', () => {
  it('shows a 404 message and a link back to home', () => {
    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <NotFound />
      </MemoryRouter>
    )

    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.getByTestId('not-found-home-link')).toHaveAttribute('href', '/')
  })
})
