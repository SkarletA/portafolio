import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetCard } from './BudgetCard'
import { deleteBudget } from '@services/budgetsService'
import type { BudgetWithProgress } from '@hooks/useBudgets'

vi.mock('@services/budgetsService', () => ({ deleteBudget: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@example.com' } }) }))
vi.mock('@context/HouseholdContext', () => ({
  useHousehold: () => ({ partner: { user_id: 'u2', first_name: 'Dana', last_name: null, avatar_url: null } }),
}))

function renderCard(budget: BudgetWithProgress, extra: { flush?: boolean; onDeleted?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <BudgetCard budget={budget} {...extra} />
    </MemoryRouter>
  )
}

const baseBudget: BudgetWithProgress = {
  id: '1',
  user_id: 'u1',
  category_id: 'c1',
  monthly_limit: 400,
  created_at: null,
  is_household: false,
  category: { id: 'c1', name: 'Food', icon: 'utensils', color: '#f59e0b', translationKey: null },
  spent: 120,
  effectiveLimit: 400,
  coveredBySavings: 0,
  percentage: 30,
  status: 'on-track',
  breakdown: [],
}

describe('BudgetCard', () => {
  beforeEach(() => {
    vi.mocked(deleteBudget).mockReset()
  })

  it('renders the category, spend vs limit, and an on-track status', () => {
    renderCard(baseBudget)

    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('$120.00 / $400.00')).toBeInTheDocument()
    expect(screen.getByText('card.status.onTrack')).toBeInTheDocument()
  })

  it('caps the progress bar visual width at 100% while keeping the real percentage as text', () => {
    renderCard({ ...baseBudget, spent: 560, percentage: 140, status: 'exceeded' })

    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    expect(screen.getByText('card.percentageLabel:{"percent":140}')).toBeInTheDocument()
    expect(screen.getByText('card.status.exceeded')).toBeInTheDocument()
  })

  it('shows spend against the effective limit and a reimbursement hint when it exceeds the monthly limit', () => {
    renderCard({
      ...baseBudget,
      monthly_limit: 2000,
      spent: 3625,
      effectiveLimit: 4000,
      coveredBySavings: 0,
      percentage: 90.625,
      status: 'near-limit',
    })

    expect(screen.getByText('$3,625.00 / $4,000.00')).toBeInTheDocument()
    expect(screen.getByText('card.reimbursedHint:{"amount":"$2,000.00"}')).toBeInTheDocument()
  })

  it('does not show a reimbursement hint when the effective limit equals the monthly limit', () => {
    renderCard(baseBudget)

    expect(screen.queryByText(/in reimbursements/)).not.toBeInTheDocument()
  })

  it('shows a near-limit status label', () => {
    renderCard({ ...baseBudget, spent: 360, percentage: 90, status: 'near-limit' })

    expect(screen.getByText('card.status.nearLimit')).toBeInTheDocument()
  })

  it('falls back to the category initial when the icon is not a known icon name', () => {
    renderCard({ ...baseBudget, category: { id: 'c1', name: 'Food', icon: null, color: null, translationKey: null } })

    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('notes spending covered by savings, which is left out of spent', () => {
    renderCard({ ...baseBudget, coveredBySavings: 1666.67 })

    expect(screen.getByText('$120.00 / $400.00')).toBeInTheDocument()
    expect(screen.getByText('card.coveredBySavingsHint:{"amount":"$1,666.67"}')).toBeInTheDocument()
  })

  it('does not show the savings note when nothing was covered by savings', () => {
    renderCard(baseBudget)

    expect(screen.queryByText(/card\.coveredBySavingsHint/)).not.toBeInTheDocument()
  })

  it('does not show contribution chips for a personal budget', () => {
    renderCard(baseBudget)

    expect(screen.queryByText(/card\.contributionYou/)).not.toBeInTheDocument()
  })

  it('shows each member\'s contribution as chips for a household budget', () => {
    renderCard({
      ...baseBudget,
      is_household: true,
      householdContributions: { own: 400, partner: 600 },
    })

    expect(screen.getByText('card.contributionYou:{"amount":"$400.00"}')).toBeInTheDocument()
    expect(screen.getByText('card.contributionOther:{"name":"Dana","amount":"$600.00"}')).toBeInTheDocument()
  })

  it('shows edit/delete actions for a budget I own', () => {
    renderCard(baseBudget)

    expect(screen.getByTestId('budget-card-1-edit-icon')).toBeInTheDocument()
    expect(screen.getByTestId('budget-card-1-delete-icon')).toBeInTheDocument()
  })

  it("hides edit/delete actions for a household partner's budget - visibility is not ownership", () => {
    renderCard({ ...baseBudget, user_id: 'u2', is_household: true, householdContributions: { own: 400, partner: 600 } })

    expect(screen.queryByTestId('budget-card-1-edit-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('budget-card-1-delete-icon')).not.toBeInTheDocument()
  })

  it('swaps to an inline delete confirmation, then calls onDeleted after a successful delete', async () => {
    vi.mocked(deleteBudget).mockResolvedValue({ error: null } as never)
    const onDeleted = vi.fn()
    renderCard(baseBudget, { onDeleted })

    fireEvent.click(screen.getByTestId('budget-card-1-delete-icon'))
    expect(screen.getByText('card.confirmDelete:{"category":"Food"}')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('budget-card-1-confirm-delete-button'))

    await waitFor(() => expect(deleteBudget).toHaveBeenCalledWith('1'))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('cancels the delete confirmation without calling deleteBudget', () => {
    renderCard(baseBudget)

    fireEvent.click(screen.getByTestId('budget-card-1-delete-icon'))
    fireEvent.click(screen.getByTestId('budget-card-1-cancel-delete-button'))

    expect(deleteBudget).not.toHaveBeenCalled()
    expect(screen.getByTestId('budget-card-1-delete-icon')).toBeInTheDocument()
  })

  it('shows an error and stays on the confirmation when the delete fails', async () => {
    vi.mocked(deleteBudget).mockResolvedValue({ error: { message: 'Network error' } } as never)
    const onDeleted = vi.fn()
    renderCard(baseBudget, { onDeleted })

    fireEvent.click(screen.getByTestId('budget-card-1-delete-icon'))
    fireEvent.click(screen.getByTestId('budget-card-1-confirm-delete-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network error')
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
