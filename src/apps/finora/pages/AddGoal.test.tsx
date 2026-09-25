import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddGoal } from './AddGoal'
import { createGoal, updateGoal } from '@services/goalsService'
import { useGoals } from '@hooks/useGoals'

vi.mock('../services/goalsService', () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
}))
vi.mock('../hooks/useGoals', () => ({ useGoals: vi.fn() }))
vi.mock('../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

const goal = {
  id: 'g1',
  user_id: 'u1',
  name: 'Emergency Fund',
  target_amount: 5000,
  current_amount: 3500,
  target_date: '2025-01-15',
  created_at: null,
  percentage: 70,
  remaining: 1500,
}

function mockGoals(goals: unknown[], overrides: Record<string, unknown> = {}) {
  vi.mocked(useGoals).mockReturnValue({
    goals,
    loading: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  } as never)
}

function renderEdit(id = 'g1') {
  render(
    <MemoryRouter initialEntries={[`/finora/goals/${id}/edit`]}>
      <Routes>
        <Route path="/finora/goals/:id/edit" element={<AddGoal mode="edit" />} />
        <Route path="/finora/goals" element={<p>goals list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function renderCreate() {
  render(
    <MemoryRouter initialEntries={['/finora/add-goal']}>
      <Routes>
        <Route path="/finora/add-goal" element={<AddGoal mode="create" />} />
        <Route path="/finora/goals" element={<p>goals list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AddGoal', () => {
  beforeEach(() => {
    vi.mocked(createGoal).mockReset()
    vi.mocked(updateGoal).mockReset()
    vi.mocked(useGoals).mockReset()
  })

  describe('create mode', () => {
    it('offers the already-saved field and a way back to the goals list', () => {
      renderCreate()

      expect(screen.getByTestId('add-goal-current-amount-input')).toBeInTheDocument()
      expect(screen.getByTestId('add-goal-back-link')).toHaveAttribute('href', '/finora/goals')
      expect(useGoals).not.toHaveBeenCalled()
    })
  })

  describe('edit mode', () => {
    it('preloads name, target amount and target date, and has no current amount field', () => {
      mockGoals([goal])
      renderEdit()

      expect(screen.getByTestId('edit-goal-name-input')).toHaveValue('Emergency Fund')
      expect(screen.getByTestId('edit-goal-target-amount-input')).toHaveValue(5000)
      expect(screen.getByTestId('edit-goal-target-date-input')).toHaveValue('2025-01-15')
      expect(screen.queryByTestId('edit-goal-current-amount-input')).not.toBeInTheDocument()
      expect(screen.getByTestId('edit-goal-back-link')).toHaveAttribute('href', '/finora/goals')
    })

    it('saves through updateGoal without current_amount and returns to the goals list', async () => {
      mockGoals([goal])
      vi.mocked(updateGoal).mockResolvedValue({ error: null } as never)
      renderEdit()

      fireEvent.change(screen.getByTestId('edit-goal-target-date-input'), { target: { value: '2027-06-30' } })
      fireEvent.click(screen.getByTestId('edit-goal-save-button'))

      await waitFor(() =>
        expect(updateGoal).toHaveBeenCalledWith('g1', {
          name: 'Emergency Fund',
          target_amount: 5000,
          target_date: '2027-06-30',
        })
      )
      expect(await screen.findByText('goals list')).toBeInTheDocument()
    })

    it('warns when the target is below what is already saved, but still saves', async () => {
      mockGoals([goal])
      vi.mocked(updateGoal).mockResolvedValue({ error: null } as never)
      renderEdit()

      expect(screen.queryByTestId('edit-goal-below-saved-warning')).not.toBeInTheDocument()

      fireEvent.change(screen.getByTestId('edit-goal-target-amount-input'), { target: { value: '3000' } })

      expect(screen.getByTestId('edit-goal-below-saved-warning')).toBeInTheDocument()

      fireEvent.click(screen.getByTestId('edit-goal-save-button'))

      await waitFor(() =>
        expect(updateGoal).toHaveBeenCalledWith('g1', expect.objectContaining({ target_amount: 3000 }))
      )
    })

    it('shows the database message when saving fails and stays on the form', async () => {
      mockGoals([goal])
      vi.mocked(updateGoal).mockResolvedValue({ error: { message: 'boom' } } as never)
      renderEdit()

      fireEvent.click(screen.getByTestId('edit-goal-save-button'))

      expect(await screen.findByText('boom')).toBeInTheDocument()
      expect(screen.queryByText('goals list')).not.toBeInTheDocument()
    })

    it('says so, with a way back, when the goal does not exist', () => {
      mockGoals([goal])
      renderEdit('missing')

      expect(screen.getByRole('alert')).toHaveTextContent('form.notFound')
      expect(screen.getByTestId('edit-goal-back-link')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-goal-name-input')).not.toBeInTheDocument()
    })
  })
})
