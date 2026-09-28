import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Goals } from './Goals'
import { useGoals } from '@hooks/useGoals'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn() }
})
vi.mock('@hooks/useGoals', () => ({ useGoals: vi.fn() }))
vi.mock('@molecules/GoalCard/GoalCard', () => ({
  GoalCard: ({ goal }: { goal: { id: string } }) => <div data-testid={`mock-goal-card-${goal.id}`} />,
}))

const EMPTY_GOALS = { goals: [], loading: false, error: null, refetch: vi.fn() }

function renderPage() {
  render(
    <MemoryRouter>
      <Goals />
    </MemoryRouter>
  )
}

describe('Goals', () => {
  beforeEach(() => {
    vi.mocked(useGoals).mockReturnValue(EMPTY_GOALS as never)
  })

  it('renders the header title, subtitle and new-goal button', () => {
    renderPage()

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('subtitle')).toBeInTheDocument()
    expect(screen.getByTestId('goals-new-button')).toHaveTextContent('newGoal')
  })

  it('navigates to add-goal when the new-goal button is clicked', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    renderPage()
    fireEvent.click(screen.getByTestId('goals-new-button'))

    expect(navigate).toHaveBeenCalledWith('/finora/add-goal')
  })

  it('shows a loading status while goals are loading', () => {
    vi.mocked(useGoals).mockReturnValue({ ...EMPTY_GOALS, loading: true } as never)

    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the error message when useGoals errors', () => {
    vi.mocked(useGoals).mockReturnValue({ ...EMPTY_GOALS, error: 'boom' } as never)

    renderPage()

    expect(screen.getByText('list.error')).toBeInTheDocument()
  })

  it('shows the empty message when there are no goals', () => {
    renderPage()

    expect(screen.getByText('list.empty')).toBeInTheDocument()
  })

  it('renders a card per goal', () => {
    const goals = [{ id: 'g1' }, { id: 'g2' }]
    vi.mocked(useGoals).mockReturnValue({ ...EMPTY_GOALS, goals } as never)

    renderPage()

    expect(screen.getByTestId('mock-goal-card-g1')).toBeInTheDocument()
    expect(screen.getByTestId('mock-goal-card-g2')).toBeInTheDocument()
  })
})
