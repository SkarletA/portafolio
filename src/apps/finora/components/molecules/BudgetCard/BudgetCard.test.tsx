import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BudgetCard } from './BudgetCard'
import type { BudgetWithProgress } from '../../../hooks/useBudgets'

const baseBudget: BudgetWithProgress = {
  id: '1',
  user_id: 'u1',
  category_id: 'c1',
  monthly_limit: 400,
  created_at: null,
  category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#f59e0b' },
  spent: 120,
  percentage: 30,
  status: 'on-track',
  breakdown: [],
}

describe('BudgetCard', () => {
  it('renders the category, spend vs limit, and an on-track status', () => {
    render(<BudgetCard budget={baseBudget} />)

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('$120 / $400')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()
  })

  it('caps the progress bar visual width at 100% while keeping the real percentage as text', () => {
    render(
      <BudgetCard
        budget={{ ...baseBudget, spent: 560, percentage: 140, status: 'exceeded' }}
      />
    )

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('140% of monthly limit')).toBeInTheDocument()
    expect(screen.getByText('Exceeded')).toBeInTheDocument()
  })

  it('shows a near-limit status label', () => {
    render(<BudgetCard budget={{ ...baseBudget, spent: 360, percentage: 90, status: 'near-limit' }} />)

    expect(screen.getByText('Near limit')).toBeInTheDocument()
  })

  it('falls back to the category initial when the icon is not a known icon name', () => {
    render(
      <BudgetCard
        budget={{ ...baseBudget, category: { id: 'c1', name: 'Food', icon: null, color: null } }}
      />
    )

    expect(screen.getByText('F')).toBeInTheDocument()
  })
})
