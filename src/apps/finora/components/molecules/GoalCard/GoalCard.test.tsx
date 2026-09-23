import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoalCard } from './GoalCard'
import { addGoalDeposit, deleteGoalDeposit, getGoalTransfers } from '@services/goalsService'
import type { GoalWithProgress } from '@hooks/useGoals'

vi.mock('../../../services/goalsService', () => ({
  addGoalDeposit: vi.fn(),
  deleteGoalDeposit: vi.fn(),
  getGoalTransfers: vi.fn(),
}))

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

const baseGoal: GoalWithProgress = {
  id: '1',
  user_id: 'u1',
  name: 'Emergency Fund',
  target_amount: 5000,
  current_amount: 3500,
  target_date: '2026-12-01',
  created_at: null,
  percentage: 70,
  remaining: 1500,
}

const deposit = {
  id: 'd1',
  user_id: 'u1',
  goal_id: '1',
  kind: 'deposit',
  amount: 500,
  date: '2026-09-01',
  transaction_id: null,
  created_at: '2026-09-01T10:00:00Z',
  transaction: null,
}

function renderCard(goal = baseGoal, onBalanceChanged = vi.fn()) {
  render(
    <MemoryRouter>
      <GoalCard goal={goal} onBalanceChanged={onBalanceChanged} />
    </MemoryRouter>
  )
  return { onBalanceChanged }
}

describe('GoalCard', () => {
  beforeEach(() => {
    vi.mocked(addGoalDeposit).mockReset()
    vi.mocked(deleteGoalDeposit).mockReset()
    vi.mocked(getGoalTransfers).mockReset()
  })

  it('renders the goal name, amounts, remaining, and percentage', () => {
    renderCard()

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    expect(screen.getByText('$3,500')).toBeInTheDocument()
    expect(screen.getByText('/ $5,000')).toBeInTheDocument()
    expect(screen.getByText('goals:card.remaining:{"amount":"$1,500"}')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('caps the progress bar visually at 100% when the goal is over-funded', () => {
    renderCard({ ...baseGoal, current_amount: 6000, percentage: 120, remaining: 0 })

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('120%')).toBeInTheDocument()
  })

  it('adds funds as a deposit dated today and reports the balance change', async () => {
    vi.mocked(addGoalDeposit).mockResolvedValue({ data: { id: 'd2' }, error: null } as never)
    const { onBalanceChanged } = renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.change(screen.getByTestId('goal-card-1-amount-input'), { target: { value: '200' } })
    fireEvent.click(screen.getByTestId('goal-card-1-confirm-button'))

    await waitFor(() => expect(onBalanceChanged).toHaveBeenCalledTimes(1))
    expect(addGoalDeposit).toHaveBeenCalledWith('1', 200, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('rounds the amount to 2 decimals when the field loses focus', () => {
    renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    const input = screen.getByTestId('goal-card-1-amount-input')
    fireEvent.change(input, { target: { value: '1.005' } })
    fireEvent.blur(input)

    expect(input).toHaveValue(1.01)
  })

  it('rejects an amount with more than 2 decimals submitted before leaving the field', async () => {
    renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.change(screen.getByTestId('goal-card-1-amount-input'), { target: { value: '10.005' } })
    fireEvent.submit(screen.getByTestId('goal-card-1-amount-input'))

    expect(await screen.findByRole('alert')).toHaveTextContent('goals:validation.amountMaxDecimals')
    expect(addGoalDeposit).not.toHaveBeenCalled()
  })

  it('shows a validation error and does not submit for a non-positive amount', async () => {
    renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.click(screen.getByTestId('goal-card-1-confirm-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('common:validation.amountGreaterThanZero')
    expect(addGoalDeposit).not.toHaveBeenCalled()
  })

  it('cancels the add-funds form without submitting', () => {
    renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.click(screen.getByTestId('goal-card-1-cancel-button'))

    expect(screen.queryByTestId('goal-card-1-amount-input')).not.toBeInTheDocument()
    expect(addGoalDeposit).not.toHaveBeenCalled()
  })

  it('loads the activity only when it is opened', async () => {
    vi.mocked(getGoalTransfers).mockResolvedValue({ data: [deposit], error: null } as never)
    renderCard()

    expect(getGoalTransfers).not.toHaveBeenCalled()

    const toggle = screen.getByTestId('goal-card-1-activity-toggle-button')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('+$500.00')).toBeInTheDocument()
    expect(getGoalTransfers).toHaveBeenCalledWith('1')
  })

  it('deletes a deposit and reports the balance change', async () => {
    vi.mocked(getGoalTransfers).mockResolvedValue({ data: [deposit], error: null } as never)
    vi.mocked(deleteGoalDeposit).mockResolvedValue({ error: null } as never)
    const { onBalanceChanged } = renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-activity-toggle-button'))
    fireEvent.click(await screen.findByTestId('goal-activity-transfer-d1-delete-icon'))

    await waitFor(() => expect(onBalanceChanged).toHaveBeenCalledTimes(1))
    expect(deleteGoalDeposit).toHaveBeenCalledWith('d1')
    expect(getGoalTransfers).toHaveBeenCalledTimes(2)
  })

  it('explains when a deposit was already used and cannot be deleted', async () => {
    vi.mocked(getGoalTransfers).mockResolvedValue({ data: [deposit], error: null } as never)
    vi.mocked(deleteGoalDeposit).mockResolvedValue({
      error: { code: 'P0001', message: 'goal_balance_negative', details: '1' },
    } as never)
    const { onBalanceChanged } = renderCard()

    fireEvent.click(screen.getByTestId('goal-card-1-activity-toggle-button'))
    fireEvent.click(await screen.findByTestId('goal-activity-transfer-d1-delete-icon'))

    expect(await screen.findByRole('alert')).toHaveTextContent('goals:activity.depositAlreadyUsed')
    expect(onBalanceChanged).not.toHaveBeenCalled()
  })
})
