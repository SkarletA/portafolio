import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GoalActivity } from './GoalActivity'
import type { GoalTransferWithTransaction } from '@services/goalsService'

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

function transfer(overrides: Partial<GoalTransferWithTransaction>): GoalTransferWithTransaction {
  return {
    id: 't1',
    user_id: 'u1',
    goal_id: 'g1',
    kind: 'deposit',
    amount: 100,
    date: '2026-09-23',
    transaction_id: null,
    created_at: '2026-09-23T10:00:00Z',
    transaction: null,
    ...overrides,
  }
}

const transfers = [
  transfer({
    id: 'w1',
    kind: 'withdrawal',
    amount: 1000,
    transaction_id: 'tx1',
    transaction: { id: 'tx1', description: 'Flights' },
  }),
  transfer({ id: 'd1', kind: 'deposit', amount: 500 }),
  transfer({ id: 'o1', kind: 'opening_balance', amount: 2000, date: '2026-05-10' }),
]

function renderActivity(props: Partial<Parameters<typeof GoalActivity>[0]> = {}) {
  const onDeleteDeposit = vi.fn()
  render(
    <MemoryRouter>
      <GoalActivity
        goalName="Vacation"
        transfers={transfers}
        loading={false}
        error={null}
        deletingId={null}
        deleteError={null}
        onDeleteDeposit={onDeleteDeposit}
        {...props}
      />
    </MemoryRouter>
  )
  return { onDeleteDeposit }
}

describe('GoalActivity', () => {
  it('lists what was saved, deposits and withdrawals with signed amounts', () => {
    renderActivity()

    expect(screen.getByText('activity.kind.opening_balance')).toBeInTheDocument()
    expect(screen.getByText('activity.kind.deposit')).toBeInTheDocument()
    expect(screen.getByText('+$2,000.00')).toBeInTheDocument()
    expect(screen.getByText('+$500.00')).toBeInTheDocument()
    expect(screen.getByText('−$1,000.00')).toBeInTheDocument()
  })

  it('links a withdrawal to the expense it covered', () => {
    renderActivity()

    expect(screen.getByTestId('goal-activity-transfer-w1-expense-link')).toHaveAttribute(
      'href',
      '/finora/transactions/tx1/edit'
    )
  })

  it('offers deletion for deposits only', () => {
    const { onDeleteDeposit } = renderActivity()

    expect(screen.queryByTestId('goal-activity-transfer-w1-delete-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('goal-activity-transfer-o1-delete-icon')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('goal-activity-transfer-d1-delete-icon'))

    expect(onDeleteDeposit).toHaveBeenCalledWith('d1')
  })

  it('disables deleting while a deletion is in progress and shows its error', () => {
    renderActivity({ deletingId: 'd1', deleteError: 'Already used' })

    expect(screen.getByTestId('goal-activity-transfer-d1-delete-icon')).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Already used')
  })

  it('shows loading, error and empty states', () => {
    const { unmount } = render(
      <MemoryRouter>
        <GoalActivity goalName="Vacation" transfers={[]} loading error={null} deletingId={null} deleteError={null} onDeleteDeposit={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('activity.loading')).toBeInTheDocument()
    unmount()

    renderActivity({ transfers: [], error: 'boom' })
    expect(screen.getByRole('alert')).toHaveTextContent('activity.error')
  })

  it('says when there is no activity yet', () => {
    renderActivity({ transfers: [] })

    expect(screen.getByText('activity.empty')).toBeInTheDocument()
  })
})
