import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total spent" value="$1,240" testId="stat-card-total-spent" />)

    expect(screen.getByText('Total spent')).toBeInTheDocument()
    expect(screen.getByText('$1,240')).toBeInTheDocument()
    expect(screen.getByTestId('stat-card-total-spent')).toBeInTheDocument()
  })

  it('applies the success variant styling', () => {
    render(<StatCard label="Savings rate" value="28%" testId="stat-card-savings-rate" variant="success" />)

    expect(screen.getByText('28%').className).toContain('valueSuccess')
  })
})
