import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMonthlyStats, grossSpendByBucketKey, sumLedgerTotals } from './analyticsService'

const tables: Record<string, unknown[]> = {}

// A thenable query builder: every filter returns it, awaiting it yields the table's rows.
function query(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
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

  it('returns an error instead of throwing when a stored amount has more than 2 decimals', async () => {
    tables.transactions = [{ ...expense(10.005), date: '2026-09-02', installment_months: 1 }]
    tables.goal_transfers = []

    const { data, error } = await getMonthlyStats(range)

    expect(data).toBeNull()
    expect(error).toBeInstanceOf(RangeError)
  })
})
