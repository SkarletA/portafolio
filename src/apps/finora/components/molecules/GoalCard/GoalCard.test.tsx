import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GoalCard } from './GoalCard'
import { addFundsToGoal } from '../../../services/goalsService'
import type { GoalWithProgress } from '../../../hooks/useGoals'

vi.mock('../../../services/goalsService', () => ({
  addFundsToGoal: vi.fn(),
}))

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

describe('GoalCard', () => {
  beforeEach(() => {
    vi.mocked(addFundsToGoal).mockReset()
  })

  it('renders the goal name, amounts, remaining, and percentage', () => {
    render(<GoalCard goal={baseGoal} onFundsAdded={vi.fn()} />)

    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
    expect(screen.getByText('$3,500')).toBeInTheDocument()
    expect(screen.getByText('/ $5,000')).toBeInTheDocument()
    expect(screen.getByText('$1,500 remaining')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('caps the progress bar visually at 100% when the goal is over-funded', () => {
    render(
      <GoalCard
        goal={{ ...baseGoal, current_amount: 6000, percentage: 120, remaining: 0 }}
        onFundsAdded={vi.fn()}
      />
    )

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('120%')).toBeInTheDocument()
  })

  it('reveals the add-funds form, submits, and calls onFundsAdded on success', async () => {
    const onFundsAdded = vi.fn()
    vi.mocked(addFundsToGoal).mockResolvedValue({ data: { id: '1' }, error: null } as never)

    render(<GoalCard goal={baseGoal} onFundsAdded={onFundsAdded} />)

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.change(screen.getByTestId('goal-card-1-amount-input'), { target: { value: '200' } })
    fireEvent.click(screen.getByTestId('goal-card-1-confirm-button'))

    await waitFor(() => expect(onFundsAdded).toHaveBeenCalledTimes(1))
    expect(addFundsToGoal).toHaveBeenCalledWith('1', 200)
  })

  it('shows a validation error and does not submit for a non-positive amount', async () => {
    render(<GoalCard goal={baseGoal} onFundsAdded={vi.fn()} />)

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.click(screen.getByTestId('goal-card-1-confirm-button'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an amount greater than 0')
    expect(addFundsToGoal).not.toHaveBeenCalled()
  })

  it('cancels the add-funds form without submitting', () => {
    render(<GoalCard goal={baseGoal} onFundsAdded={vi.fn()} />)

    fireEvent.click(screen.getByTestId('goal-card-1-add-funds-button'))
    fireEvent.click(screen.getByTestId('goal-card-1-cancel-button'))

    expect(screen.queryByTestId('goal-card-1-amount-input')).not.toBeInTheDocument()
    expect(addFundsToGoal).not.toHaveBeenCalled()
  })
})
