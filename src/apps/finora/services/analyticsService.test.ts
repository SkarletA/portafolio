import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyStats, grossSpendByBucketKey, sumLedgerTotals } from './analyticsService'

const tables: Record<string, unknown[]> = {}
const filterCalls: [string, ...unknown[]][] = []

// A thenable query builder: every filter returns it (and is recorded),
// awaiting it yields the table's rows.
function query(table: string) {
  const builder = {
    select: () => builder,
    eq: (...args: [string, unknown]) => (filterCalls.push(['eq', ...args]), builder),
    in: (...args: [string, unknown]) => (filterCalls.push(['in', ...args]), builder),
    lte: () => builder,
    gte: () => builder,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: tables[table] ?? [], error: null }),
  }
  return builder
}

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }) },
    from: (table: string) => query(table),
  },
}))

const expense = (amount: number, funding_source: 'income' | 'savings' = 'income') => ({
  type: 'expense' as const,
  funding_source,
  amount,
})

describe('sumLedgerTotals', () => {
  it('adds each kind exactly, without float noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3)

    expect(
      sumLedgerTotals([
        expense(0.1),
        expense(0.2),
        expense(4.06, 'savings'),
        expense(9.54, 'savings'),
        { type: 'income', funding_source: 'income', amount: 0.7 },
        { type: 'income', funding_source: 'income', amount: 0.1 },
        { type: 'reimbursement', funding_source: 'income', amount: 0.3 },
      ])
    ).toEqual({ totalSpent: 0.3, totalCoveredBySavings: 13.6, totalIncome: 0.8, totalReimbursed: 0.3 })
  })

  it('leaves a reimbursement linked to a savings-funded purchase out of every total, including income', () => {
    expect(
      sumLedgerTotals([
        expense(40, 'savings'),
        { type: 'income', funding_source: 'income', amount: 1000 },
        { type: 'reimbursement', funding_source: 'savings', amount: 15 },
      ])
    ).toEqual({ totalSpent: 0, totalCoveredBySavings: 40, totalIncome: 1000, totalReimbursed: 0 })
  })
})

describe('grossSpendByBucketKey', () => {
  const row = (date: string, amount: number) => ({
    date,
    amount,
    type: 'expense' as const,
    installment_months: 1,
    funding_source: 'income' as const,
  })

  it('adds the expenses of each bucket exactly and skips savings-funded ones', () => {
    const totals = grossSpendByBucketKey(
      [
        row('2026-09-01', 0.1),
        row('2026-09-15', 0.2),
        row('2026-10-01', 4.06),
        { ...row('2026-10-02', 99), funding_source: 'savings' as const },
      ],
      (date) => date.slice(0, 7)
    )

    expect(totals).toEqual({ '2026-09': 0.3, '2026-10': 4.06 })
  })
})

describe('getMonthlyStats', () => {
  const range = { start: '2026-09-01', end: '2026-09-30' }

  beforeEach(() => {
    for (const key of Object.keys(tables)) delete tables[key]
    filterCalls.length = 0
  })

  it('totals the period exactly, including goal deposits and the savings rate', async () => {
    tables.transactions = [
      { ...expense(0.1), date: '2026-09-02', installment_months: 1 },
      { ...expense(0.2), date: '2026-09-03', installment_months: 1 },
      { type: 'income', funding_source: 'income', amount: 1, date: '2026-09-04', installment_months: 1 },
    ]
    tables.goal_transfers = [{ amount: 0.1 }, { amount: 0.2 }]

    const { data, error } = await getMonthlyStats(range)

    expect(error).toBeNull()
    expect(data?.totalSpent).toBe(0.3)
    expect(data?.totalIncome).toBe(1)
    expect(data?.totalDepositedToGoals).toBe(0.3)
    expect(data?.savingsRate).toBeCloseTo(70)
  })

  // No backfill (ADR-006): the rows stored today are unlinked reimbursements with
  // funding_source 'income', and they net the savings rate exactly as before.
  it('nets every existing reimbursement against the savings rate exactly as before ADR-006', async () => {
    tables.transactions = [
      { type: 'income', funding_source: 'income', amount: 1000, date: '2026-09-01', installment_months: 1 },
      { ...expense(400), date: '2026-09-02', installment_months: 1 },
      { type: 'reimbursement', funding_source: 'income', amount: 100, date: '2026-09-05', installment_months: 1 },
    ]
    tables.goal_transfers = []

    const { data } = await getMonthlyStats(range)

    expect(data?.totalSpent).toBe(400)
    expect(data?.totalIncome).toBe(1000)
    expect(data?.savingsRate).toBeCloseTo(70)
  })

  it('does not raise the savings rate or income for a reimbursement returned to a Goal', async () => {
    tables.transactions = [
      { type: 'income', funding_source: 'income', amount: 1000, date: '2026-09-01', installment_months: 1 },
      { ...expense(400), date: '2026-09-02', installment_months: 1 },
      { ...expense(200, 'savings'), date: '2026-09-03', installment_months: 1 },
      { type: 'reimbursement', funding_source: 'savings', amount: 200, date: '2026-09-05', installment_months: 1 },
    ]
    tables.goal_transfers = []

    const { data } = await getMonthlyStats(range)

    expect(data?.totalIncome).toBe(1000)
    expect(data?.totalCoveredBySavings).toBe(200)
    expect(data?.savingsRate).toBeCloseTo(60)
  })

  it('returns an error instead of throwing when a stored amount has more than 2 decimals', async () => {
    tables.transactions = [{ ...expense(10.005), date: '2026-09-02', installment_months: 1 }]
    tables.goal_transfers = []

    const { data, error } = await getMonthlyStats(range)

    expect(data).toBeNull()
    expect(error).toBeInstanceOf(RangeError)
  })

  it('filters to only the caller when no household ids are given', async () => {
    tables.transactions = []
    tables.goal_transfers = []

    await getMonthlyStats(range)

    expect(filterCalls).toContainEqual(['in', 'user_id', ['u1']])
  })

  it('filters to every given household member instead (ADR-011)', async () => {
    tables.transactions = []
    tables.goal_transfers = []

    await getMonthlyStats(range, ['u1', 'u2'])

    expect(filterCalls).toContainEqual(['in', 'user_id', ['u1', 'u2']])
  })
})
