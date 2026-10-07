import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddRecurringExpense } from './AddRecurringExpense'
import { createRecurringExpense, updateRecurringExpense } from '@services/recurringExpensesService'
import { useRecurringExpenses } from '@hooks/useRecurringExpenses'
import { useCategories } from '@hooks/useCategories'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('@services/recurringExpensesService', () => ({
  createRecurringExpense: vi.fn(),
  updateRecurringExpense: vi.fn(),
}))
vi.mock('@hooks/useRecurringExpenses', () => ({ useRecurringExpenses: vi.fn() }))
vi.mock('@hooks/useCategories', () => ({ useCategories: vi.fn() }))
vi.mock('@domain/date', () => ({ getTodayLocalDate: () => '2026-10-06' }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))

const CATEGORY = { id: 'c1', name: 'Entertainment', icon: null, color: null, parent_id: null, translationKey: null }

const recurringExpense = {
  id: 'r1',
  user_id: 'u1',
  day_of_month: 15,
  start_on: '2026-08-15',
  ended_on: null as string | null,
  last_error: null,
  last_error_at: null,
  terms: [
    {
      id: 't1',
      recurring_expense_id: 'r1',
      effective_from: '2026-08-15',
      description: 'Streaming',
      amount: 199,
      category_id: 'c1',
      payment_method: 'Credit Card',
      is_shared: false,
      owner_share_amount: null as number | null,
      category: CATEGORY,
    },
  ],
  occurrences: [],
}

function mockCategories() {
  vi.mocked(useCategories).mockReturnValue({ categories: [CATEGORY], loading: false, error: null, refetch: vi.fn() } as never)
}

function mockRecurringExpenses(recurringExpenses: unknown[]) {
  vi.mocked(useRecurringExpenses).mockReturnValue({ recurringExpenses, loading: false, error: null, refetch: vi.fn() } as never)
}

function renderCreate() {
  render(
    <MemoryRouter initialEntries={['/finora/add-recurring-expense']}>
      <Routes>
        <Route path="/finora/add-recurring-expense" element={<AddRecurringExpense mode="create" />} />
        <Route path="/finora/recurring" element={<p>recurring list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function renderEdit(id = 'r1') {
  render(
    <MemoryRouter initialEntries={[`/finora/recurring/${id}/edit`]}>
      <Routes>
        <Route path="/finora/recurring/:id/edit" element={<AddRecurringExpense mode="edit" />} />
        <Route path="/finora/recurring" element={<p>recurring list</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function fillCategoryAndPayment(prefix: string) {
  fireEvent.click(screen.getByTestId(`${prefix}-category-select-trigger`))
  fireEvent.click(screen.getByTestId(`${prefix}-category-select-option-c1`))
  fireEvent.click(screen.getByTestId(`${prefix}-payment-method-select-trigger`))
  fireEvent.click(screen.getByTestId(`${prefix}-payment-method-select-option-Credit Card`))
}

describe('AddRecurringExpense', () => {
  beforeEach(() => {
    vi.mocked(createRecurringExpense).mockReset()
    vi.mocked(updateRecurringExpense).mockReset()
    mockCategories()
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: null, partner: null } as never)
  })

  describe('create mode', () => {
    it('shows the day-of-month field, not the effective-from field, and a way back', () => {
      renderCreate()

      expect(screen.getByTestId('add-recurring-expense-day-of-month-input')).toBeInTheDocument()
      expect(screen.queryByTestId('add-recurring-expense-effective-from-input')).not.toBeInTheDocument()
      expect(screen.getByTestId('add-recurring-expense-back-link')).toHaveAttribute('href', '/finora/recurring')
      expect(useRecurringExpenses).not.toHaveBeenCalled()
    })

    it('blocks submit with no server call when required fields are missing', () => {
      renderCreate()

      fireEvent.click(screen.getByTestId('add-recurring-expense-save-button'))

      expect(screen.getByText('common:validation.required')).toBeInTheDocument()
      expect(screen.getByText('common:validation.amountGreaterThanZero')).toBeInTheDocument()
      expect(createRecurringExpense).not.toHaveBeenCalled()
    })

    it('creates the template and returns to the list on success', async () => {
      vi.mocked(createRecurringExpense).mockResolvedValue({ data: 'r2', error: null } as never)
      renderCreate()

      fireEvent.change(screen.getByTestId('add-recurring-expense-description-input'), { target: { value: 'Streaming' } })
      fireEvent.change(screen.getByTestId('add-recurring-expense-amount-input'), { target: { value: '199' } })
      fillCategoryAndPayment('add-recurring-expense')
      fireEvent.change(screen.getByTestId('add-recurring-expense-day-of-month-input'), { target: { value: '15' } })
      fireEvent.click(screen.getByTestId('add-recurring-expense-save-button'))

      await waitFor(() =>
        expect(createRecurringExpense).toHaveBeenCalledWith(
          {
            description: 'Streaming',
            amount: 199,
            category_id: 'c1',
            payment_method: 'Credit Card',
            is_shared: false,
            owner_share_amount: null,
          },
          15,
          '2026-10-06'
        )
      )
      expect(await screen.findByText('recurring list')).toBeInTheDocument()
    })

    it('rejects a day of month outside 1-31, without calling the server', () => {
      renderCreate()

      fireEvent.change(screen.getByTestId('add-recurring-expense-description-input'), { target: { value: 'Streaming' } })
      fireEvent.change(screen.getByTestId('add-recurring-expense-amount-input'), { target: { value: '199' } })
      fillCategoryAndPayment('add-recurring-expense')
      fireEvent.change(screen.getByTestId('add-recurring-expense-day-of-month-input'), { target: { value: '32' } })
      fireEvent.click(screen.getByTestId('add-recurring-expense-save-button'))

      expect(screen.getByText('recurring:validation.dayOfMonthRange')).toBeInTheDocument()
      expect(createRecurringExpense).not.toHaveBeenCalled()
    })

    it('maps a server amount error to the amount field', async () => {
      vi.mocked(createRecurringExpense).mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'invalid_amount' },
      } as never)
      renderCreate()

      fireEvent.change(screen.getByTestId('add-recurring-expense-description-input'), { target: { value: 'Streaming' } })
      fireEvent.change(screen.getByTestId('add-recurring-expense-amount-input'), { target: { value: '199' } })
      fillCategoryAndPayment('add-recurring-expense')
      fireEvent.change(screen.getByTestId('add-recurring-expense-day-of-month-input'), { target: { value: '15' } })
      fireEvent.click(screen.getByTestId('add-recurring-expense-save-button'))

      expect(await screen.findByText('recurring:validation.amountMaxDecimals')).toBeInTheDocument()
    })
  })

  describe('edit mode', () => {
    it('preloads the current term, shows the effective-from field, not day-of-month', () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit()

      expect(screen.getByTestId('edit-recurring-expense-description-input')).toHaveValue('Streaming')
      expect(screen.getByTestId('edit-recurring-expense-amount-input')).toHaveValue(199)
      expect(screen.getByTestId('edit-recurring-expense-effective-from-input')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-recurring-expense-day-of-month-input')).not.toBeInTheDocument()
    })

    it("does not offer today in the date picker - the server always rejects it", () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit()

      // today is mocked as '2026-10-06'; the picker must start at the 7th.
      expect(screen.getByTestId('edit-recurring-expense-effective-from-input')).toHaveAttribute('min', '2026-10-07')
    })

    it('shows which charge will be the first to use the new price', () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit()

      expect(screen.queryByTestId('edit-recurring-expense-first-charge-with-new-price-hint')).not.toBeInTheDocument()

      // day_of_month is 15 and October's charge (the 15th) hasn't happened yet
      // relative to "today" (the 6th), so a date right after today still lands
      // in the October cycle.
      fireEvent.change(screen.getByTestId('edit-recurring-expense-effective-from-input'), { target: { value: '2026-10-07' } })

      expect(screen.getByTestId('edit-recurring-expense-first-charge-with-new-price-hint')).toHaveTextContent(
        'form.firstChargeWithNewPrice:{"date":"Oct 15, 2026"}'
      )
    })

    it('shows November, not October, once the chosen date is past this cycle\'s charge day', () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit()

      // Past the 15th: October's charge date is behind the chosen date, so the
      // new price can only reach November's - exactly why it "doesn't take" for
      // the month in transit.
      fireEvent.change(screen.getByTestId('edit-recurring-expense-effective-from-input'), { target: { value: '2026-10-16' } })

      expect(screen.getByTestId('edit-recurring-expense-first-charge-with-new-price-hint')).toHaveTextContent(
        'form.firstChargeWithNewPrice:{"date":"Nov 15, 2026"}'
      )
    })

    it('preloads the term on the creation day, before its first charge is due', () => {
      // create_recurring_expense never backfills: effective_from is today + 1
      // ('2026-10-06' is mocked as today), so nothing is "in force" yet.
      mockRecurringExpenses([
        {
          ...recurringExpense,
          start_on: '2026-10-07',
          terms: [{ ...recurringExpense.terms[0], effective_from: '2026-10-07' }],
        },
      ])
      renderEdit()

      expect(screen.getByTestId('edit-recurring-expense-description-input')).toHaveValue('Streaming')
      expect(screen.getByTestId('edit-recurring-expense-amount-input')).toHaveValue(199)
    })

    it('rejects an effective date that is not after today, without calling the server', () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit()

      fireEvent.click(screen.getByTestId('edit-recurring-expense-save-button'))

      expect(screen.getByText('recurring:validation.effectiveFromMustBeFuture')).toBeInTheDocument()
      expect(updateRecurringExpense).not.toHaveBeenCalled()
    })

    it('saves through updateRecurringExpense with the new effective date and returns to the list', async () => {
      mockRecurringExpenses([recurringExpense])
      vi.mocked(updateRecurringExpense).mockResolvedValue({ data: 'r1', error: null } as never)
      renderEdit()

      fireEvent.change(screen.getByTestId('edit-recurring-expense-amount-input'), { target: { value: '249' } })
      fireEvent.change(screen.getByTestId('edit-recurring-expense-effective-from-input'), { target: { value: '2026-11-01' } })
      fireEvent.click(screen.getByTestId('edit-recurring-expense-save-button'))

      await waitFor(() =>
        expect(updateRecurringExpense).toHaveBeenCalledWith(
          'r1',
          '2026-11-01',
          {
            description: 'Streaming',
            amount: 249,
            category_id: 'c1',
            payment_method: 'Credit Card',
            is_shared: false,
            owner_share_amount: null,
          },
          '2026-10-06'
        )
      )
      expect(await screen.findByText('recurring list')).toBeInTheDocument()
    })

    it('says so, with a way back, when the recurring expense does not exist', () => {
      mockRecurringExpenses([recurringExpense])
      renderEdit('missing')

      expect(screen.getByRole('alert')).toHaveTextContent('form.notFound')
      expect(screen.getByTestId('edit-recurring-expense-back-link')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-recurring-expense-description-input')).not.toBeInTheDocument()
    })

    it('refuses to edit an already-cancelled template', () => {
      mockRecurringExpenses([{ ...recurringExpense, ended_on: '2026-11-01' }])
      renderEdit()

      expect(screen.getByRole('alert')).toHaveTextContent('form.cannotEditCancelled')
      expect(screen.queryByTestId('edit-recurring-expense-description-input')).not.toBeInTheDocument()
    })
  })
})
