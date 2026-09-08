import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NavItem } from './NavItem'

describe('NavItem', () => {
  it('renders a link when "to" is provided', () => {
    render(
      <MemoryRouter>
        <NavItem label="Transactions" icon={<span />} to="/finora/transactions" />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /transactions/i })).toBeInTheDocument()
  })

  it('renders a disabled item when "to" is missing', () => {
    render(<NavItem label="Budgets" icon={<span />} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Budgets')).toBeInTheDocument()
  })
})
