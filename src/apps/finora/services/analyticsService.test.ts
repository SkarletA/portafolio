import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getHouseholdSpendingByCategory,
  getHouseholdTrendData,
  getMonthlyStats,
  getTrendData,
  grossSpendByBucketKey,
  sumLedgerTotals,
} from './analyticsService'

const tables: Record<string, unknown[]> = {}
const filterCalls: [string, ...unknown[]][] = []

// A thenable query builder: every filter returns it (and is recorded),
// awaiting it yields the table's rows.
function query(table: string) {
  const builder = {
    select: () => builder,
    eq: (...args: [string, unknown]) => (filterCalls.push(['eq', ...args]), builder),
    in: (...args: [string, unknown]) => (filterCalls.push(['in', ...args]), builder),
    or: (...args: [string]) => (filterCalls.push(['or', ...args]), builder),
    order: () => builder,
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

const housingCategory = { id: 'housing', name: 'Housing', icon: null, color: null, parent_id: null, translationKey: null }

describe('local calendar boundary (ADR-013)', () => {
  // The suite runs in Mexico City (vitest.globalSetup.js): 2026-10-01T00:00Z is
  // 2026-09-30 18:00 there, so the UTC and local calendar days differ.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    for (const key of Object.keys(tables)) delete tables[key]
    filterCalls.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs the suite in Mexico City time, so the boundary cases below are meaningful', () => {
    expect(new Date(2026, 8, 30, 18).getTimezoneOffset()).toBe(360)
  })

  it('averages over the days elapsed in the local month', async () => {
    // 2026-10-02T00:00Z is 2026-10-01 18:00 in Mexico City: one day of October has elapsed.
    vi.setSystemTime(new Date('2026-10-02T00:00:00Z'))
    tables.transactions = [{ ...expense(10), date: '2026-10-01', installment_months: 1 }]
    tables.goal_transfers = []

    const { data } = await getMonthlyStats({ start: '2026-10-01', end: '2026-10-31' })

    expect(data?.avgPerDay).toBe(10)
  })

  it('ends the day trend on the local day', async () => {
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'))
    tables.transactions = []

    const { data } = await getTrendData('day')

    expect(data?.at(-1)?.date).toBe('2026-09-30')
  })

  it('ends the month trend on the local month', async () => {
    vi.setSystemTime(new Date('2026-10-01T00:00:00Z'))
    tables.transactions = []

    const { data } = await getTrendData('month')

    expect(data?.at(-1)?.date).toBe('2026-09-01')
  })

  it('ends the year trend on the local year at 31 December', async () => {
    // 2027-01-01T00:00Z is 2026-12-31 18:00 in Mexico City.
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
    tables.transactions = []

    const { data } = await getTrendData('year')

    expect(data?.at(-1)?.date).toBe('2026-01-01')
  })
})

describe('getHouseholdSpendingByCategory (ADR-010/011 attribution)', () => {
  beforeEach(() => {
    for (const key of Object.keys(tables)) delete tables[key]
    filterCalls.length = 0
  })

  const range = { start: '2026-09-01', end: '2026-09-30' }

  // The reported bug: a Case A split lives in one row with one user_id, so a
  // query merely filtered to "rows I own" gives the full amount to whoever
  // recorded it and nothing to the other member. The fix attributes by
  // transaction_shares.amount instead, same as the household budget (PR8).
  it("splits a Case A shared transaction (rent $14,700, $5,200/$9,500) by each member's own share", async () => {
    tables.transactions = [
      {
        category_id: 'housing',
        amount: 14700,
        type: 'expense',
        date: '2026-09-05',
        installment_months: 1,
        funding_source: 'income',
        user_id: 'u1',
        is_shared: true,
        is_household_expense: false,
        shares: [
          { user_id: 'u1', amount: 5200 },
          { user_id: 'u2', amount: 9500 },
        ],
      },
    ]
    tables.categories = [housingCategory]

    const { data, error } = await getHouseholdSpendingByCategory(range, { ownId: 'u1', partnerId: 'u2' })

    expect(error).toBeNull()
    expect(data?.own.find((category) => category.category_id === 'housing')?.amount).toBe(5200)
    expect(data?.partner.find((category) => category.category_id === 'housing')?.amount).toBe(9500)
  })

  it('splits an even 50/50 share correctly too', async () => {
    tables.transactions = [
      {
        category_id: 'housing',
        amount: 2000,
        type: 'expense',
        date: '2026-09-05',
        installment_months: 1,
        funding_source: 'income',
        user_id: 'u2',
        is_shared: true,
        is_household_expense: false,
        shares: [
          { user_id: 'u1', amount: 1000 },
          { user_id: 'u2', amount: 1000 },
        ],
      },
    ]
    tables.categories = [housingCategory]

    const { data } = await getHouseholdSpendingByCategory(range, { ownId: 'u1', partnerId: 'u2' })

    expect(data?.own.find((category) => category.category_id === 'housing')?.amount).toBe(1000)
    expect(data?.partner.find((category) => category.category_id === 'housing')?.amount).toBe(1000)
  })

  it('attributes a Case B household-tagged expense in full to whoever recorded it, nothing to the other', async () => {
    tables.transactions = [
      {
        category_id: 'housing',
        amount: 250,
        type: 'expense',
        date: '2026-09-02',
        installment_months: 1,
        funding_source: 'income',
        user_id: 'u2',
        is_shared: false,
        is_household_expense: true,
        shares: [],
      },
    ]
    tables.categories = [housingCategory]

    const { data } = await getHouseholdSpendingByCategory(range, { ownId: 'u1', partnerId: 'u2' })

    expect(data?.own.find((category) => category.category_id === 'housing')).toBeUndefined()
    expect(data?.partner.find((category) => category.category_id === 'housing')?.amount).toBe(250)
  })
})

describe('getHouseholdTrendData (ADR-010/011 attribution)', () => {
  beforeEach(() => {
    for (const key of Object.keys(tables)) delete tables[key]
    filterCalls.length = 0
  })

  it("splits a Case A transaction's amount into the right trend bucket for each member", async () => {
    const todayIso = new Date().toISOString().slice(0, 10)
    tables.transactions = [
      {
        category_id: 'housing',
        amount: 14700,
        type: 'expense',
        date: todayIso,
        installment_months: 1,
        funding_source: 'income',
        user_id: 'u1',
        is_shared: true,
        is_household_expense: false,
        shares: [
          { user_id: 'u1', amount: 5200 },
          { user_id: 'u2', amount: 9500 },
        ],
      },
    ]

    const { data, error } = await getHouseholdTrendData('day', { ownId: 'u1', partnerId: 'u2' })

    expect(error).toBeNull()
    expect(data?.find((point) => point.date === todayIso)).toEqual({ date: todayIso, own: 5200, partner: 9500 })
  })
})
