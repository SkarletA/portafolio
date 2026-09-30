import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PurchaseHasLinkedRefundsError } from './moneyMovementErrors'
import { deleteTransaction, getRefundablePurchases, getTransactions, saveTransaction } from './transactionsService'

interface Call {
  table: string
  action: 'delete' | 'select'
  columns: string
  filters: [string, ...unknown[]][]
}

const calls: Call[] = []
const rpcCalls: { fn: string; args: Record<string, unknown> }[] = []
let deleteResult: { error: { code?: string; message?: string } | null }
let selectResult: (call: Call) => { data: unknown[]; error: null }

// A thenable query builder that records what was asked and answers per call.
function query(table: string) {
  const call: Call = { table, action: 'select', columns: '', filters: [] }
  const builder = {
    select: (columns: string) => {
      call.columns = columns
      return builder
    },
    delete: () => {
      call.action = 'delete'
      return builder
    },
    eq: (...args: [string, unknown]) => (call.filters.push(['eq', ...args]), builder),
    in: (...args: [string, unknown]) => (call.filters.push(['in', ...args]), builder),
    not: (...args: [string, string, unknown]) => (call.filters.push(['not', ...args]), builder),
    order: () => builder,
    then: (resolve: (value: unknown) => void) => {
      calls.push(call)
      resolve(call.action === 'delete' ? deleteResult : selectResult(call))
    },
  }
  return builder
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }) },
    from: (table: string) => query(table),
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      return Promise.resolve({ data: 'new-id', error: null })
    },
  },
}))

beforeEach(() => {
  calls.length = 0
  rpcCalls.length = 0
  deleteResult = { error: null }
  selectResult = () => ({ data: [], error: null })
})

const newTransaction = {
  description: 'Store refund',
  amount: 30,
  type: 'reimbursement' as const,
  category_id: 'food',
  date: '2026-09-12',
  notes: null,
  installment_months: 1,
  savings_goal_id: null,
  payments: [{ payment_method: 'Cash', amount: 30 }],
}

describe('getTransactions', () => {
  it('filters to only the caller when no household ids are given', async () => {
    await getTransactions()

    expect(calls[0].filters).toContainEqual(['in', 'user_id', ['u1']])
  })

  it('filters to every given household member instead', async () => {
    await getTransactions(['u1', 'u2'])

    expect(calls[0].filters).toContainEqual(['in', 'user_id', ['u1', 'u2']])
  })
})

describe('saveTransaction', () => {
  it('sends the purchase a reimbursement refunds', async () => {
    await saveTransaction(null, { ...newTransaction, refunds_transaction_id: 'purchase-1' })

    expect(rpcCalls[0].fn).toBe('save_transaction')
    expect(rpcCalls[0].args.p_refunds_transaction_id).toBe('purchase-1')
  })

  it('sends no link for a standalone reimbursement, exactly as before', async () => {
    await saveTransaction(null, newTransaction)

    expect(rpcCalls[0].args.p_refunds_transaction_id).toBeNull()
  })

  it('sends the shares for a shared expense', async () => {
    const shares = [
      { user_id: 'u1', amount: 20 },
      { user_id: 'u2', amount: 10 },
    ]
    await saveTransaction(null, { ...newTransaction, type: 'expense', shares })

    expect(rpcCalls[0].args.p_shares).toEqual(shares)
  })

  it('sends null shares when omitted, exactly as before', async () => {
    await saveTransaction(null, newTransaction)

    expect(rpcCalls[0].args.p_shares).toBeNull()
  })

  it('sends null shares for an empty shares array', async () => {
    await saveTransaction(null, { ...newTransaction, shares: [] })

    expect(rpcCalls[0].args.p_shares).toBeNull()
  })

  it('sends is_household_expense when set', async () => {
    await saveTransaction(null, { ...newTransaction, type: 'expense', is_household_expense: true })

    expect(rpcCalls[0].args.p_is_household_expense).toBe(true)
  })

  it('sends false for is_household_expense when omitted, exactly as before', async () => {
    await saveTransaction(null, newTransaction)

    expect(rpcCalls[0].args.p_is_household_expense).toBe(false)
  })
})

describe('deleteTransaction', () => {
  it('passes a successful delete through untouched', async () => {
    const { error } = await deleteTransaction('purchase-1')

    expect(error).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it('passes any other error through without looking for reimbursements', async () => {
    deleteResult = { error: { code: '23503', message: 'violates foreign key constraint "goal_transfers_goal_id_fkey"' } }

    const { error } = await deleteTransaction('goal-1')

    expect(error).not.toBeInstanceOf(PurchaseHasLinkedRefundsError)
    expect(calls).toHaveLength(1)
  })

  it('names the reimbursements that block deleting a purchase', async () => {
    const refunds = [
      { id: 'r1', description: 'Shoes refund 1', amount: 40, date: '2026-09-05' },
      { id: 'r2', description: 'Shoes refund 2', amount: 60, date: '2026-09-06' },
    ]
    deleteResult = {
      error: {
        code: '23503',
        message:
          'update or delete on table "transactions" violates foreign key constraint "transactions_refunds_transaction_id_fkey" on table "transactions"',
      },
    }
    selectResult = () => ({ data: refunds, error: null })

    const { error } = await deleteTransaction('purchase-1')

    expect(error).toBeInstanceOf(PurchaseHasLinkedRefundsError)
    expect((error as PurchaseHasLinkedRefundsError).refunds).toEqual(refunds)
    expect(calls[1].filters).toContainEqual(['eq', 'refunds_transaction_id', 'purchase-1'])
  })
})

describe('getRefundablePurchases', () => {
  const options = { refundDate: '2026-09-30', currentPurchaseId: null, ownRefundAmount: 0 }
  const purchase = (id: string, amount: number, date: string, goalName: string | null = null) => ({
    id,
    type: 'expense',
    description: id,
    amount,
    date,
    category_id: 'food',
    withdrawal: goalName ? { goal_id: 'g1', goal: { name: goalName } } : null, // RefundablePurchase.withdrawal, unrelated to Transaction.goal_transfer
  })

  beforeEach(() => {
    selectResult = (call) =>
      call.columns.startsWith('id,')
        ? {
            data: [purchase('shoes', 100, '2026-09-01'), purchase('laptop', 200, '2026-09-02', 'Vacation'), purchase('used-up', 50, '2026-09-03')],
            error: null,
          }
        : {
            data: [
              { amount: 0.1, refunds_transaction_id: 'shoes' },
              { amount: 0.2, refunds_transaction_id: 'shoes' },
              { amount: 50, refunds_transaction_id: 'used-up' },
            ],
            error: null,
          }
  })

  it('lists purchases with what is still refundable, and the Goal that paid for them', async () => {
    const { data, error } = await getRefundablePurchases(options)

    expect(error).toBeNull()
    expect(data?.map(({ id, remaining }) => [id, remaining])).toEqual([
      ['laptop', 200],
      ['shoes', 99.7],
    ])
    expect(data?.[0].withdrawal?.goal?.name).toBe('Vacation')
  })

  it("only asks for the user's own expenses that have a category", async () => {
    await getRefundablePurchases(options)

    const purchasesCall = calls.find((call) => call.columns.startsWith('id,'))
    expect(purchasesCall?.filters).toEqual(
      expect.arrayContaining([
        ['eq', 'user_id', 'u1'],
        ['eq', 'type', 'expense'],
        ['not', 'category_id', 'is', null],
      ])
    )
  })
})
