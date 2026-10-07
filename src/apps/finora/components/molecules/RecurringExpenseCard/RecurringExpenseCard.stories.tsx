import { RecurringExpenseCard } from './RecurringExpenseCard'

const CATEGORY = { id: 'c1', name: 'Entertainment', icon: null, color: '#7c3aed', translationKey: null }
const TODAY = '2026-10-06'

export default {
  title: 'Finora/Molecules/RecurringExpenseCard',
  component: RecurringExpenseCard,
  parameters: {
    docs: {
      description: {
        component:
          'One recurring expense template: its current term, next charge, status, and the actions to edit, cancel, or publish an overdue charge now (ADR-012).',
      },
    },
  },
  argTypes: {
    recurringExpense: {
      description: 'The template, its term history and its generated occurrences.',
      control: false,
      table: { type: { summary: 'RecurringExpenseWithDetails' } },
    },
    today: {
      description: "The caller's local calendar date (ADR-013).",
      control: 'text',
    },
    onChanged: {
      description: 'Called after a cancel or a "post now" that changed the template or posted a charge.',
      action: 'changed',
      table: { type: { summary: 'function' } },
    },
  },
}

export const Active = {
  args: {
    today: TODAY,
    recurringExpense: {
      id: '1',
      user_id: 'u1',
      day_of_month: 15,
      start_on: '2026-08-15',
      ended_on: null,
      last_error: null,
      last_error_at: null,
      terms: [
        {
          id: 't1',
          recurring_expense_id: '1',
          effective_from: '2026-08-15',
          description: 'Streaming subscription',
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
    },
  },
}

export const Overdue = {
  args: {
    ...Active.args,
    recurringExpense: {
      ...Active.args.recurringExpense,
      id: '2',
      last_error: 'insufficient_funds',
      last_error_at: '2026-09-15T18:05:00Z',
      occurrences: [{ id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1' }],
    },
  },
}

export const Ending = {
  args: {
    ...Active.args,
    recurringExpense: { ...Active.args.recurringExpense, id: '3', ended_on: '2026-12-01' },
  },
}

export const Cancelled = {
  args: {
    ...Active.args,
    recurringExpense: { ...Active.args.recurringExpense, id: '4', ended_on: '2026-09-01' },
  },
}
