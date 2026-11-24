import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders as a div when no href is given', () => {
    render(
      <Card accentColor="#2dd4bf" testId="plain-card">
        <p>content</p>
      </Card>
    )

    const card = screen.getByTestId('plain-card')
    expect(card.tagName).toBe('DIV')
    expect(card).toHaveTextContent('content')
  })

  it('renders as an internal Link when href is given', () => {
    render(
      <MemoryRouter>
        <Card accentColor="#ff4d5e" href="/finora" testId="link-card">
          <p>content</p>
        </Card>
      </MemoryRouter>
    )

    const card = screen.getByTestId('link-card')
    expect(card.tagName).toBe('A')
    expect(card).toHaveAttribute('href', '/finora')
  })
})
