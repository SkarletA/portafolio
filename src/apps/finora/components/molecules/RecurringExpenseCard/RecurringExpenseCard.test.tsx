import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringExpenseCard } from './RecurringExpenseCard'
import { cancelRecurringExpense, postMyRecurringExpenses } from '@services/recurringExpensesService'
import type { RecurringExpenseWithDetails } from '@services/recurringExpensesService'

vi.mock('@services/recurringExpensesService', () => ({
  cancelRecurringExpense: vi.fn(),
  postMyRecurringExpenses: vi.fn(),
}))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))

const CATEGORY = { id: 'c1', name: 'Entertainment', icon: null, color: null, translationKey: null }

function recurringExpense(overrides: Partial<RecurringExpenseWithDetails> = {}): RecurringExpenseWithDetails {
  return {
    id: 'r1',
    user_id: 'u1',
    day_of_month: 15,
    start_on: '2026-08-15',
    ended_on: null,
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
        category: CATEGORY,
      },
    ],
    occurrences: [
      { id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1' },
      { id: 'o2', scheduled_date: '2026-09-15', transaction_id: 'tx2' },
    ],
    ...overrides,
  }
}

function renderCard(expense: RecurringExpenseWithDetails, today = '2026-10-06', onChanged = vi.fn()) {
  return { onChanged, ...render(
    <MemoryRouter>
      <RecurringExpenseCard recurringExpense={expense} today={today} onChanged={onChanged} />
    </MemoryRouter>
  ) }
}

describe('RecurringExpenseCard', () => {
  beforeEach(() => {
    vi.mocked(cancelRecurringExpense).mockReset()
    vi.mocked(postMyRecurringExpenses).mockReset()
  })

  it('renders the current term, category and an active status', () => {
    renderCard(recurringExpense())

    expect(screen.getByText('Streaming')).toBeInTheDocument()
    expect(screen.getByText('$199.00 · Entertainment')).toBeInTheDocument()
    expect(screen.getByText('card.status.active')).toBeInTheDocument()
    expect(screen.getByText('card.nextCharge:{"date":"Oct 15, 2026"}')).toBeInTheDocument()
  })

  it('shows edit and cancel icons for an active template', () => {
    renderCard(recurringExpense())

    expect(screen.getByTestId('recurring-card-r1-edit-icon')).toBeInTheDocument()
    expect(screen.getByTestId('recurring-card-r1-cancel-icon')).toBeInTheDocument()
  })

  it('hides edit and cancel icons once the template has an end date', () => {
    renderCard(recurringExpense({ ended_on: '2026-12-01' }))

    expect(screen.queryByTestId('recurring-card-r1-edit-icon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('recurring-card-r1-cancel-icon')).not.toBeInTheDocument()
  })

  it('shows "ending" for a future end date and "cancelled" for a past one', () => {
    renderCard(recurringExpense({ ended_on: '2026-12-01' }))
    expect(screen.getByText('card.status.ending:{"date":"Dec 1, 2026"}')).toBeInTheDocument()
  })

  it('shows no overdue banner when every due date has posted', () => {
    renderCard(recurringExpense())

    expect(screen.queryByTestId('recurring-card-r1-overdue-banner')).not.toBeInTheDocument()
  })

  it('shows the overdue banner and posts now when a due date never posted', async () => {
    const expense = recurringExpense({ occurrences: [{ id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1' }] })
    vi.mocked(postMyRecurringExpenses).mockResolvedValue({ data: 1, error: null } as never)
    const { onChanged } = renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-overdue-banner')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('recurring-card-r1-post-now-button'))

    await waitFor(() => expect(postMyRecurringExpenses).toHaveBeenCalledWith('2026-10-06'))
    expect(onChanged).toHaveBeenCalled()
  })

  it('shows the error returned when "post now" fails', async () => {
    const expense = recurringExpense({ occurrences: [] })
    vi.mocked(postMyRecurringExpenses).mockResolvedValue({ data: null, error: { message: 'boom' } } as never)
    renderCard(expense)

    fireEvent.click(screen.getByTestId('recurring-card-r1-post-now-button'))

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('confirms before cancelling, and calls cancelRecurringExpense with today as the end date', async () => {
    vi.mocked(cancelRecurringExpense).mockResolvedValue({ data: null, error: null } as never)
    const { onChanged } = renderCard(recurringExpense())

    fireEvent.click(screen.getByTestId('recurring-card-r1-cancel-icon'))
    expect(screen.getByText('card.confirmCancel:{"description":"Streaming"}')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('recurring-card-r1-confirm-cancel-button'))

    await waitFor(() => expect(cancelRecurringExpense).toHaveBeenCalledWith('r1', '2026-10-06', '2026-10-06'))
    expect(onChanged).toHaveBeenCalled()
  })

  it('dismissing the cancel confirmation does not call the server', () => {
    renderCard(recurringExpense())

    fireEvent.click(screen.getByTestId('recurring-card-r1-cancel-icon'))
    fireEvent.click(screen.getByTestId('recurring-card-r1-dismiss-cancel-button'))

    expect(cancelRecurringExpense).not.toHaveBeenCalled()
    expect(screen.getByTestId('recurring-card-r1-cancel-icon')).toBeInTheDocument()
  })

  it('shows a hint when the last posting attempt failed', () => {
    renderCard(recurringExpense({ last_error: 'insufficient_funds', last_error_at: '2026-10-05T18:00:00Z' }))

    expect(screen.getByText('card.lastErrorHint')).toBeInTheDocument()
  })
})
