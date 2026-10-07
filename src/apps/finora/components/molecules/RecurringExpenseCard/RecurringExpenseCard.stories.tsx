import { authHandlers, MOCK_USER_ID, signInMockUser } from '@storybook-mocks/supabaseAuth'
import { restHandler, rpcHandler } from '@storybook-mocks/supabaseRest'
import { RecurringExpenseCard } from './RecurringExpenseCard'

const CATEGORY = { id: 'c1', name: 'Entertainment', icon: null, color: '#7c3aed', translationKey: null }
const TODAY = '2026-10-06'
const PARTNER_ID = '00000000-0000-4000-8000-000000000002'

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
          is_shared: false,
          owner_share_amount: null,
          is_household_expense: false,
          category: CATEGORY,
        },
      ],
      occurrences: [
        { id: 'o1', scheduled_date: '2026-08-15', transaction_id: 'tx1', posted_without_household: false },
        { id: 'o2', scheduled_date: '2026-09-15', transaction_id: 'tx2', posted_without_household: false },
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

// ADR-014: an accepted partner, so the signed-in user's own share and the
// partner's display name both resolve to something real, the same reason
// BudgetCard's HouseholdBudget story needs this.
export const Shared = {
  args: {
    ...Active.args,
    recurringExpense: {
      ...Active.args.recurringExpense,
      id: '5',
      terms: [{ ...Active.args.recurringExpense.terms[0], is_shared: true, owner_share_amount: 120 }],
    },
  },
  loaders: [signInMockUser],
  parameters: {
    msw: {
      handlers: [
        ...authHandlers,
        restHandler('household_members', [
          { id: 'm1', household_id: 'h1', user_id: MOCK_USER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
          { id: 'm2', household_id: 'h1', user_id: PARTNER_ID, status: 'accepted', invited_by: MOCK_USER_ID },
        ]),
        rpcHandler('get_household_partner', { user_id: PARTNER_ID, first_name: 'Maribel', last_name: 'Prueba', avatar_url: null }),
      ],
    },
  },
}

// Same shared term, but with no accepted partner - the fallback the posting
// job itself uses (post unshared, mark the occurrence), shown here as the
// preventive warning before that ever has to happen.
export const SharedNoPartner = {
  args: {
    ...Active.args,
    recurringExpense: {
      ...Active.args.recurringExpense,
      id: '6',
      terms: [{ ...Active.args.recurringExpense.terms[0], is_shared: true, owner_share_amount: 120 }],
    },
  },
}

// ADR-015: the household tag, no split - the full amount posts to the owner
// every time, just tagged as counting toward the household.
export const HouseholdExpense = {
  args: {
    ...Active.args,
    recurringExpense: {
      ...Active.args.recurringExpense,
      id: '7',
      terms: [{ ...Active.args.recurringExpense.terms[0], is_household_expense: true }],
    },
  },
}
