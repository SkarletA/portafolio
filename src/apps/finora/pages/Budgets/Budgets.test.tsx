import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Budgets } from './Budgets'
import { useBudgets } from '@hooks/useBudgets'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: vi.fn() }
})
vi.mock('@hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@molecules/BudgetCard/BudgetCard', () => ({
  BudgetCard: ({ budget, flush }: { budget: { id: string }; flush: boolean }) => (
    <div data-testid={`mock-budget-card-${budget.id}`} data-flush={flush} />
  ),
}))
vi.mock('@molecules/BudgetCardBreakdown/BudgetCardBreakdown', () => ({
  BudgetCardBreakdown: ({ categoryId }: { categoryId: string }) => (
    <div data-testid={`mock-budget-breakdown-${categoryId}`} />
  ),
}))

const EMPTY_BUDGETS = { budgets: [], loading: false, error: null, refetch: vi.fn() }

function renderPage() {
  render(
    <MemoryRouter>
      <Budgets />
    </MemoryRouter>
  )
}

describe('Budgets', () => {
  beforeEach(() => {
    vi.mocked(useBudgets).mockReturnValue(EMPTY_BUDGETS as never)
  })

  it('renders the header title, subtitle and new-budget button', () => {
    renderPage()

    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('subtitle')).toBeInTheDocument()
    expect(screen.getByTestId('budgets-new-button')).toHaveTextContent('newBudget')
  })

  it('navigates to add-budget when the new-budget button is clicked', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)

    renderPage()
    fireEvent.click(screen.getByTestId('budgets-new-button'))

    expect(navigate).toHaveBeenCalledWith('/finora/add-budget')
  })

  it('shows a loading status while budgets are loading', () => {
    vi.mocked(useBudgets).mockReturnValue({ ...EMPTY_BUDGETS, loading: true } as never)

    renderPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the error message when useBudgets errors', () => {
    vi.mocked(useBudgets).mockReturnValue({ ...EMPTY_BUDGETS, error: 'boom' } as never)

    renderPage()

    expect(screen.getByText('list.error')).toBeInTheDocument()
  })

  it('shows the empty message when there are no budgets', () => {
    renderPage()

    expect(screen.getByText('list.empty')).toBeInTheDocument()
  })

  it('renders a card and breakdown per budget, flush only when it has a breakdown', () => {
    const budgets = [
      { id: 'b1', category_id: 'c1', category: { name: 'Food' }, effectiveLimit: 300, breakdown: [{ category_id: 'c1a' }] },
      { id: 'b2', category_id: 'c2', category: null, effectiveLimit: 150, breakdown: [] },
    ]
    vi.mocked(useBudgets).mockReturnValue({ ...EMPTY_BUDGETS, budgets } as never)

    renderPage()

    expect(screen.getByTestId('mock-budget-card-b1')).toHaveAttribute('data-flush', 'true')
    expect(screen.getByTestId('mock-budget-card-b2')).toHaveAttribute('data-flush', 'false')
    expect(screen.getByTestId('mock-budget-breakdown-c1')).toBeInTheDocument()
    expect(screen.getByTestId('mock-budget-breakdown-c2')).toBeInTheDocument()
  })
})
