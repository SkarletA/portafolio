import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge variant="success">Completed</Badge>)

    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('applies the shared variant styling', () => {
    render(<Badge variant="shared">You $60.00</Badge>)

    expect(screen.getByText('You $60.00').className).toContain('shared')
  })

  it('applies the context variant styling', () => {
    render(<Badge variant="context">Refund of Shoes</Badge>)

    expect(screen.getByText('Refund of Shoes').className).toContain('context')
  })
})
