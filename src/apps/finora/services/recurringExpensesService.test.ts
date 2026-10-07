import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@services/supabaseClient'
import {
  cancelRecurringExpense,
  createRecurringExpense,
  postMyRecurringExpenses,
  updateRecurringExpense,
  type RecurringExpenseInput,
} from '@services/recurringExpensesService'

vi.mock('@services/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}))

const input: RecurringExpenseInput = {
  description: 'Streaming',
  amount: 199,
  category_id: 'c1',
  payment_method: 'Credit Card',
  is_shared: false,
  owner_share_amount: null,
  is_household_expense: false,
}

describe('recurringExpensesService', () => {
  beforeEach(() => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)
  })

  it('createRecurringExpense sends the description, amount, category, payment method, day and today', async () => {
    await createRecurringExpense(input, 15, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith('create_recurring_expense', {
      p_description: 'Streaming',
      p_amount: 199,
      p_category_id: 'c1',
      p_payment_method: 'Credit Card',
      p_day_of_month: 15,
      p_today: '2026-10-06',
      p_is_shared: false,
      p_owner_share_amount: undefined,
      p_is_household_expense: false,
    })
  })

  it('createRecurringExpense sends the split when the term is shared', async () => {
    await createRecurringExpense({ ...input, is_shared: true, owner_share_amount: 120 }, 15, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_recurring_expense',
      expect.objectContaining({ p_is_shared: true, p_owner_share_amount: 120 })
    )
  })

  it('createRecurringExpense sends the household tag', async () => {
    await createRecurringExpense({ ...input, is_household_expense: true }, 15, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_recurring_expense',
      expect.objectContaining({ p_is_household_expense: true })
    )
  })

  it('updateRecurringExpense sends the new term with its effective date', async () => {
    await updateRecurringExpense('r1', '2026-11-01', input, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith('update_recurring_expense', {
      p_id: 'r1',
      p_effective_from: '2026-11-01',
      p_description: 'Streaming',
      p_amount: 199,
      p_category_id: 'c1',
      p_payment_method: 'Credit Card',
      p_today: '2026-10-06',
      p_is_shared: false,
      p_owner_share_amount: undefined,
      p_is_household_expense: false,
    })
  })

  it('updateRecurringExpense sends the split when the term is shared', async () => {
    await updateRecurringExpense('r1', '2026-11-01', { ...input, is_shared: true, owner_share_amount: 120 }, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'update_recurring_expense',
      expect.objectContaining({ p_is_shared: true, p_owner_share_amount: 120 })
    )
  })

  it('updateRecurringExpense sends the household tag', async () => {
    await updateRecurringExpense('r1', '2026-11-01', { ...input, is_household_expense: true }, '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'update_recurring_expense',
      expect.objectContaining({ p_is_household_expense: true })
    )
  })

  it('cancelRecurringExpense sends the end date', async () => {
    await cancelRecurringExpense('r1', '2026-10-06', '2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith('cancel_recurring_expense', {
      p_id: 'r1',
      p_ended_on: '2026-10-06',
      p_today: '2026-10-06',
    })
  })

  it('postMyRecurringExpenses sends only today', async () => {
    await postMyRecurringExpenses('2026-10-06')

    expect(supabase.rpc).toHaveBeenCalledWith('post_my_recurring_expenses', { p_today: '2026-10-06' })
  })
})
