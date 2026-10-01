import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddBudget } from './AddBudget'
import { createBudget } from '@services/budgetsService'
import { useAuth } from '@context/AuthContext'
import { useHousehold } from '@context/HouseholdContext'
import { useBudgets } from '@hooks/useBudgets'

vi.mock('@services/budgetsService', () => ({ createBudget: vi.fn() }))
const categories = [{ id: 'c1', name: 'Food', icon: null, color: null, parent_id: null, translationKey: null }]

vi.mock('@hooks/useCategories', () => ({
  useCategories: () => ({ categories, loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@hooks/useBudgets', () => ({ useBudgets: vi.fn() }))
vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))
// The select's own behavior is not under test: this stands in for picking a category.
vi.mock('@atoms/Select/GroupedSelect', () => ({
  GroupedSelect: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" data-testid="pick-category" onClick={() => onChange('c1')}>
      pick
    </button>
  ),
}))

const acceptedPartnerMember = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { user_id: 'u2', first_name: 'Dana', last_name: null, avatar_url: null }

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
    vi.mocked(useBudgets).mockReturnValue({ budgets: [], loading: false, error: null, refetch: vi.fn() } as never)
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: null } } as never)
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: null, partner: null } as never)
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

    await waitFor(() =>
      expect(createBudget).toHaveBeenCalledWith({ category_id: 'c1', monthly_limit: 250.5, is_household: false })
    )
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

  it('keeps the household toggle disabled without an accepted household partner', () => {
    renderPage()

    expect(screen.getByTestId('add-budget-household-checkbox')).toBeDisabled()
  })

  it('saves a household budget when the toggle is checked, with an accepted partner', async () => {
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: acceptedPartnerMember, partner: acceptedPartner } as never)
    vi.mocked(createBudget).mockResolvedValue({ error: null } as never)
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('100')
    fireEvent.click(screen.getByTestId('add-budget-household-checkbox'))
    fireEvent.click(screen.getByTestId('add-budget-save-button'))

    await waitFor(() =>
      expect(createBudget).toHaveBeenCalledWith({ category_id: 'c1', monthly_limit: 100, is_household: true })
    )
  })

  it('warns and blocks saving when my partner already has a household budget in the selected category', () => {
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: acceptedPartnerMember, partner: acceptedPartner } as never)
    vi.mocked(useBudgets).mockReturnValue({
      budgets: [{ id: 'existing', user_id: 'u2', category_id: 'c1', is_household: true }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('100')
    fireEvent.click(screen.getByTestId('add-budget-household-checkbox'))
    fireEvent.click(screen.getByTestId('add-budget-save-button'))

    expect(screen.getByTestId('add-budget-household-duplicate-warning')).toHaveTextContent(
      'budgets:validation.householdDuplicate'
    )
    expect(createBudget).not.toHaveBeenCalled()
  })

  it('does not block a personal budget in a category where my partner already has a household budget', async () => {
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: acceptedPartnerMember, partner: acceptedPartner } as never)
    vi.mocked(useBudgets).mockReturnValue({
      budgets: [{ id: 'existing', user_id: 'u2', category_id: 'c1', is_household: true }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as never)
    vi.mocked(createBudget).mockResolvedValue({ error: null } as never)
    renderPage()

    fireEvent.click(screen.getByTestId('pick-category'))
    fillLimit('100')
    fireEvent.click(screen.getByTestId('add-budget-save-button'))

    await waitFor(() =>
      expect(createBudget).toHaveBeenCalledWith({ category_id: 'c1', monthly_limit: 100, is_household: false })
    )
  })
})
