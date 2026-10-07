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
    })
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
    })
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
