import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringExpenseCard } from './RecurringExpenseCard'
import { cancelRecurringExpense, postMyRecurringExpenses } from '@services/recurringExpensesService'
import type { RecurringExpenseWithDetails } from '@services/recurringExpensesService'
import { useHousehold } from '@context/HouseholdContext'
import { useGoals } from '@hooks/useGoals'

vi.mock('@services/recurringExpensesService', () => ({
  cancelRecurringExpense: vi.fn(),
  postMyRecurringExpenses: vi.fn(),
}))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))
vi.mock('@hooks/useGoals', () => ({ useGoals: vi.fn() }))

const ACCEPTED_PARTNER_MEMBER = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }
const PARTNER = { user_id: 'u2', first_name: 'Bel', last_name: 'Suarez', avatar_url: null }

const CATEGORY = { id: 'c1', name: 'Entertainment', icon: null, color: null, translationKey: null }

function recurringExpense(overrides: Partial<RecurringExpenseWithDetails> = {}): RecurringExpenseWithDetails {
  return {
    id: 'r1',
    user_id: 'u1',
    day_of_month: 15,
    start_on: '2026-08-15',
    ended_on: null,
    planned_end_on: null,
    planned_charges: null,
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
        owner_share_amount: null,
        is_household_expense: false,
        savings_goal_id: null,
        category: CATEGORY,
      },
    ],
    occurrences: [
      { id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1', posted_without_household: false },
      { id: 'o2', scheduled_date: '2026-09-15', transaction_id: 'tx2', posted_without_household: false },
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
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: null, partner: null } as never)
    vi.mocked(useGoals).mockReturnValue({ goals: [], loading: false } as never)
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

  it('shows the term on the creation day, before its first charge is even due', () => {
    // create_recurring_expense never backfills: the only term's effective_from
    // is today + 1, so nothing is "in force" yet on creation day.
    const expense = recurringExpense({
      start_on: '2026-10-07',
      terms: [
        {
          id: 't1',
          recurring_expense_id: 'r1',
          effective_from: '2026-10-07',
          description: 'Streaming',
          amount: 199,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: false,
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
      occurrences: [],
    })

    renderCard(expense, '2026-10-06')

    expect(screen.getByText('Streaming')).toBeInTheDocument()
    expect(screen.getByText('$199.00 · Entertainment')).toBeInTheDocument()
  })

  it('shows no price-change hint when there is only the current term', () => {
    renderCard(recurringExpense())

    expect(screen.queryByTestId('recurring-card-r1-price-change-hint')).not.toBeInTheDocument()
  })

  it('shows no price-change hint for a brand-new template, before its only term has applied', () => {
    // Reported bug: create_recurring_expense never backfills, so the only
    // term's effective_from is today + 1. getCurrentTerm falls back to it,
    // and it must not also be echoed back as a "price change" of itself.
    const expense = recurringExpense({
      start_on: '2026-10-12',
      terms: [
        {
          id: 't1',
          recurring_expense_id: 'r1',
          effective_from: '2026-10-12',
          description: 'Netflix',
          amount: 299,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: false,
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
      occurrences: [],
    })

    renderCard(expense, '2026-10-07')

    expect(screen.queryByTestId('recurring-card-r1-price-change-hint')).not.toBeInTheDocument()
  })

  it('shows which charge a scheduled price change will first reach', () => {
    const expense = recurringExpense({
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
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
        {
          id: 't2',
          recurring_expense_id: 'r1',
          effective_from: '2026-11-01',
          description: 'Streaming',
          amount: 249,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: false,
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    // Still $199 today - the edit does not rewrite what's already in force.
    expect(screen.getByText('$199.00 · Entertainment')).toBeInTheDocument()
    expect(screen.getByTestId('recurring-card-r1-price-change-hint')).toHaveTextContent(
      'card.priceChangeHint:{"amount":"$249.00","date":"Nov 15, 2026"}'
    )
  })

  it('shows no overdue banner when every due date has posted', () => {
    renderCard(recurringExpense())

    expect(screen.queryByTestId('recurring-card-r1-overdue-banner')).not.toBeInTheDocument()
  })

  it('shows the overdue banner and posts now when a due date never posted', async () => {
    const expense = recurringExpense({ occurrences: [{ id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1', posted_without_household: false }] })
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

  it('shows who it is shared with and the owner\'s part, for a shared term', () => {
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: ACCEPTED_PARTNER_MEMBER, partner: PARTNER } as never)
    const expense = recurringExpense({
      terms: [
        {
          id: 't1',
          recurring_expense_id: 'r1',
          effective_from: '2026-08-15',
          description: 'Streaming',
          amount: 199,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: true,
          owner_share_amount: 120,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-shared-with')).toHaveTextContent(
      'card.sharedWith:{"partner":"Bel Suarez","amount":"$120.00"}'
    )
  })

  it('shows no shared-with line for an unshared term', () => {
    renderCard(recurringExpense())

    expect(screen.queryByTestId('recurring-card-r1-shared-with')).not.toBeInTheDocument()
  })

  it('warns when a shared term has no accepted partner right now', () => {
    const expense = recurringExpense({
      terms: [
        {
          id: 't1',
          recurring_expense_id: 'r1',
          effective_from: '2026-08-15',
          description: 'Streaming',
          amount: 199,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: true,
          owner_share_amount: 120,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-shared-no-partner-warning')).toHaveTextContent(
      'card.sharedNoPartnerWarning'
    )
  })

  it('shows no no-partner warning for a shared term once a partner is accepted', () => {
    vi.mocked(useHousehold).mockReturnValue({ partnerMember: ACCEPTED_PARTNER_MEMBER, partner: PARTNER } as never)
    const expense = recurringExpense({
      terms: [
        {
          id: 't1',
          recurring_expense_id: 'r1',
          effective_from: '2026-08-15',
          description: 'Streaming',
          amount: 199,
          category_id: 'c1',
          payment_method: 'Credit Card',
          is_shared: true,
          owner_share_amount: 120,
          is_household_expense: false,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.queryByTestId('recurring-card-r1-shared-no-partner-warning')).not.toBeInTheDocument()
  })

  it('shows the household tag for a term covered entirely by the owner', () => {
    const expense = recurringExpense({
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
          owner_share_amount: null,
          is_household_expense: true,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-household-expense')).toHaveTextContent('card.householdExpenseTag')
  })

  it('warns when a household-tagged term has no accepted partner right now', () => {
    const expense = recurringExpense({
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
          owner_share_amount: null,
          is_household_expense: true,
          savings_goal_id: null,
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-shared-no-partner-warning')).toBeInTheDocument()
  })

  it('shows which goal funds the term, for a savings-funded term', () => {
    vi.mocked(useGoals).mockReturnValue({ goals: [{ id: 'g1', name: 'Emergency fund', current_amount: 500 }], loading: false } as never)
    const expense = recurringExpense({
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
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: 'g1',
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-funded-from')).toHaveTextContent('card.fundedFrom')
  })

  it('shows the missing amount when the goal lacks funds for the next charge', () => {
    vi.mocked(useGoals).mockReturnValue({ goals: [{ id: 'g1', name: 'Emergency fund', current_amount: 120 }], loading: false } as never)
    const expense = recurringExpense({
      last_error: 'insufficient_goal_funds',
      last_error_at: '2026-10-05T18:00:00Z',
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
          owner_share_amount: null,
          is_household_expense: false,
          savings_goal_id: 'g1',
          category: CATEGORY,
        },
      ],
    })

    renderCard(expense)

    expect(screen.getByTestId('recurring-card-r1-last-error-hint')).toHaveTextContent('card.insufficientGoalFundsHint')
    expect(screen.queryByText('card.lastErrorHint')).not.toBeInTheDocument()
  })
})
