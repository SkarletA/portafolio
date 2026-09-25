import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BackLink } from './BackLink'

describe('BackLink', () => {
  it('links to the given route with its label as the accessible name', () => {
    render(
      <MemoryRouter>
        <BackLink to="/finora/goals">Back to goals</BackLink>
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: 'Back to goals' })

    expect(link).toHaveAttribute('href', '/finora/goals')
  })
})
