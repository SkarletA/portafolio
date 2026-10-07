import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringExpenses } from './RecurringExpenses'
import { useRecurringExpenses } from '@hooks/useRecurringExpenses'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn() }
})
vi.mock('@hooks/useRecurringExpenses', () => ({ useRecurringExpenses: vi.fn() }))
vi.mock('@molecules/RecurringExpenseCard/RecurringExpenseCard', () => ({
  RecurringExpenseCard: ({ recurringExpense }: { recurringExpense: { id: string } }) => (
    <div data-testid={`mock-recurring-card-${recurringExpense.id}`} />
  ),
}))

const EMPTY = { recurringExpenses: [], loading: false, error: null, refetch: vi.fn() }

function renderPage() {
  render(
    <MemoryRouter>
      <RecurringExpenses />
    </MemoryRouter>
  )
}

describe('RecurringExpenses', () => {
  beforeEach(() => {
    vi.mocked(useRecurringExpenses).mockReturnValue(EMPTY as never)
  })

  it('renders the header title, subtitle and new button', () => {
    renderPage()

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('subtitle')).toBeInTheDocument()
    expect(screen.getByTestId('recurring-new-button')).toHaveTextContent('newRecurringExpense')
  })

  it('navigates to add-recurring-expense when the new button is clicked', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    renderPage()
    fireEvent.click(screen.getByTestId('recurring-new-button'))

    expect(navigate).toHaveBeenCalledWith('/finora/add-recurring-expense')
  })

  it('shows a loading status while recurring expenses are loading', () => {
    vi.mocked(useRecurringExpenses).mockReturnValue({ ...EMPTY, loading: true } as never)

    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the error message when the hook errors', () => {
    vi.mocked(useRecurringExpenses).mockReturnValue({ ...EMPTY, error: 'boom' } as never)

    renderPage()

    expect(screen.getByText('list.error')).toBeInTheDocument()
  })

  it('shows the empty message when there are no recurring expenses', () => {
    renderPage()

    expect(screen.getByText('list.empty')).toBeInTheDocument()
  })

  it('renders a card per recurring expense', () => {
    const recurringExpenses = [{ id: 'r1' }, { id: 'r2' }]
    vi.mocked(useRecurringExpenses).mockReturnValue({ ...EMPTY, recurringExpenses } as never)

    renderPage()

    expect(screen.getByTestId('mock-recurring-card-r1')).toBeInTheDocument()
    expect(screen.getByTestId('mock-recurring-card-r2')).toBeInTheDocument()
  })
})
