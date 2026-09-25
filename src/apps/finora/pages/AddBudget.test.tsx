import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddBudget } from './AddBudget'
import { createBudget } from '@services/budgetsService'

vi.mock('../services/budgetsService', () => ({ createBudget: vi.fn() }))
const categories = [{ id: 'c1', name: 'Food', icon: null, color: null, parent_id: null, translationKey: null }]

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ categories, loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('../hooks/useBudgets', () => ({ useBudgets: () => ({ budgets: [], loading: false }) }))
// The select's own behavior is not under test: this stands in for picking a category.
vi.mock('../components/atoms/Select/GroupedSelect', () => ({
  GroupedSelect: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" data-testid="pick-category" onClick={() => onChange('c1')}>
      pick
    </button>
  ),
}))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/add-budget']}>
      <Routes>
        <Route path="/finora/add-budget" element={<AddBudget />} />
        <Route path="/finora/budgets" element={<p>budgets list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function fillLimit(value: string) {
  fireEvent.change(screen.getByTestId('add-budget-monthly-limit-input'), { target: { value } })
}

describe('AddBudget', () => {
  beforeEach(() => {
    vi.mocked(createBudget).mockReset()
  })

  it('rounds the limit to 2 decimals when the field loses focus', () => {
    renderPage()

    fillLimit('10.005')
    fireEvent.blur(screen.getByTestId('add-budget-monthly-limit-input'))

    expect(screen.getByTestId('add-budget-monthly-limit-input')).toHaveValue(10.01)
  })

  it('rejects a limit with more than 2 decimals submitted before leaving the field, without saving it', () => {
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('10.005')
    fireEvent.submit(screen.getByTestId('add-budget-save-button').closest('form') as HTMLFormElement)

    expect(screen.getByRole('alert')).toHaveTextContent('budgets:validation.amountMaxDecimals')
    expect(createBudget).not.toHaveBeenCalled()
  })

  it('saves a valid limit and returns to the budgets list', async () => {
    vi.mocked(createBudget).mockResolvedValue({ error: null } as never)
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('250.5')
    fireEvent.click(screen.getByTestId('add-budget-save-button'))

    await waitFor(() => expect(createBudget).toHaveBeenCalledWith({ category_id: 'c1', monthly_limit: 250.5 }))
    expect(await screen.findByText('budgets list')).toBeInTheDocument()
  })

  it('still asks for a limit greater than 0', () => {
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('0')
    fireEvent.click(screen.getByTestId('add-budget-save-button'))

    expect(screen.getByRole('alert')).toHaveTextContent('budgets:validation.limitGreaterThanZero')
    expect(createBudget).not.toHaveBeenCalled()
  })
})
