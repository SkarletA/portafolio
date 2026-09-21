import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BudgetCard } from './BudgetCard'
import type { BudgetWithProgress } from '../../../hooks/useBudgets'

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

const baseBudget: BudgetWithProgress = {
  id: '1',
  user_id: 'u1',
  category_id: 'c1',
  monthly_limit: 400,
  created_at: null,
  category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#f59e0b', translationKey: null },
  spent: 120,
  effectiveLimit: 400,
  percentage: 30,
  status: 'on-track',
  breakdown: [],
}

describe('BudgetCard', () => {
  it('renders the category, spend vs limit, and an on-track status', () => {
    render(<BudgetCard budget={baseBudget} />)

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('$120 / $400')).toBeInTheDocument()
    expect(screen.getByText('card.status.onTrack')).toBeInTheDocument()
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
    expect(screen.getByText('card.percentageLabel:{"percent":140}')).toBeInTheDocument()
    expect(screen.getByText('card.status.exceeded')).toBeInTheDocument()
  })

  it('shows spend against the effective limit and a reimbursement hint when it exceeds the monthly limit', () => {
    render(
      <BudgetCard
        budget={{
          ...baseBudget,
          monthly_limit: 2000,
          spent: 3625,
          effectiveLimit: 4000,
          percentage: 90.625,
          status: 'near-limit',
        }}
      />
    )

    expect(screen.getByText('$3,625 / $4,000')).toBeInTheDocument()
    expect(screen.getByText('card.reimbursedHint:{"amount":"$2,000"}')).toBeInTheDocument()
  })

  it('does not show a reimbursement hint when the effective limit equals the monthly limit', () => {
    render(<BudgetCard budget={baseBudget} />)

    expect(screen.queryByText(/in reimbursements/)).not.toBeInTheDocument()
  })

  it('shows a near-limit status label', () => {
    render(<BudgetCard budget={{ ...baseBudget, spent: 360, percentage: 90, status: 'near-limit' }} />)

    expect(screen.getByText('card.status.nearLimit')).toBeInTheDocument()
  })

  it('falls back to the category initial when the icon is not a known icon name', () => {
    render(
      <BudgetCard
        budget={{ ...baseBudget, category: { id: 'c1', name: 'Food', icon: null, color: null, translationKey: null } }}
      />
    )

    expect(screen.getByText('F')).toBeInTheDocument()
  })
})
