import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import {
  getHouseholdSpendingByCategory,
  getHouseholdTrendData,
  getMonthlyStats,
  getPeriodComparison,
  getTrendData,
} from '@services/analyticsService'
import { getExpensesByCategory } from '@services/transactionsService'
import { getCategories } from '@services/categoriesService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/analyticsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/analyticsService')>()
  return {
    // Pure functions the hook calls directly (buildCategorySpending to turn
    // raw totals into a list, buildCategoryComparison to build each member's
    // comparison table) are kept real - only the I/O functions are replaced.
    buildCategorySpending: actual.buildCategorySpending,
    buildCategoryComparison: actual.buildCategoryComparison,
    getMonthlyStats: vi.fn(),
    getTrendData: vi.fn(),
    getPeriodComparison: vi.fn(),
    getHouseholdSpendingByCategory: vi.fn(),
    getHouseholdTrendData: vi.fn(),
  }
})

vi.mock('../services/transactionsService', () => ({
  getExpensesByCategory: vi.fn(),
}))

vi.mock('../services/categoriesService', () => ({
  getCategories: vi.fn(),
}))

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: vi.fn(),
}))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }

const emptyStats = { totalSpent: 0, totalIncome: 0, avgPerDay: 0, savingsRate: 0 }
const emptyComparison = {
  currentTotal: 0,
  previousTotal: 0,
  totalPercentChange: 0,
  categories: [],
  hasPreviousData: false,
}
const emptyExpenses = { totals: {}, raw: {}, reimbursements: {}, savingsCovered: {} }

const foodCategory = { id: 'c1', name: 'Food', icon: null, color: '#2563eb', parent_id: null, translationKey: null }

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.mocked(getMonthlyStats).mockReset()
    vi.mocked(getExpensesByCategory).mockReset()
    vi.mocked(getCategories).mockReset()
    vi.mocked(getTrendData).mockReset()
    vi.mocked(getPeriodComparison).mockReset()
    vi.mocked(getHouseholdSpendingByCategory).mockReset()
    vi.mocked(getHouseholdTrendData).mockReset()
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null } as never)
    vi.mocked(getCategories).mockResolvedValue({ data: [], error: null } as never)
  })

  it('loads stats, category spending, trend data, and comparison successfully', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({
      data: { totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 },
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { c1: 500 }, raw: { c1: 500 }, reimbursements: {}, savingsCovered: {} },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({ data: [foodCategory], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({
      data: [{ date: '2026-09-01', amount: 500 }],
      error: null,
    } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({
      data: {
        currentTotal: 500,
        previousTotal: 400,
        totalPercentChange: 25,
        categories: [],
        hasPreviousData: true,
      },
      error: null,
    } as never)

    const { result } = renderHook(() => useAnalytics())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual({ totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 })
    expect(result.current.spendingByCategory).toEqual([
      { category_id: 'c1', name: 'Food', icon: null, color: '#2563eb', translationKey: null, amount: 500, percentage: 100 },
    ])
    expect(result.current.categories).toEqual([foodCategory])
    expect(result.current.rawByCategory).toEqual({ c1: 500 })
    expect(result.current.trendData).toEqual([{ date: '2026-09-01', amount: 500 }])
    expect(result.current.comparison).toEqual({
      currentTotal: 500,
      previousTotal: 400,
      totalPercentChange: 25,
      categories: [],
      hasPreviousData: true,
    })
    expect(result.current.isHouseholdView).toBe(false)
    expect(result.current.householdBreakdown).toBeNull()
    expect(result.current.error).toBeNull()
    expect(getMonthlyStats).toHaveBeenCalledWith(
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
      undefined
    )
    expect(getExpensesByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
      undefined
    )
    expect(getTrendData).toHaveBeenCalledWith('month', undefined)
    expect(getPeriodComparison).toHaveBeenCalledWith('month', undefined)
  })

  it('refetches with the requested period type', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: emptyExpenses, error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('year'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('year', undefined))
    expect(getPeriodComparison).toHaveBeenCalledWith('year', undefined)
  })

  it('treats an empty period as a valid, non-error state', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: emptyExpenses, error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual(emptyStats)
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.trendData).toEqual([])
    expect(result.current.comparison).toEqual(emptyComparison)
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears data when any fetch fails', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: emptyExpenses, error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toBeNull()
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.trendData).toEqual([])
    expect(result.current.comparison).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('stays "mine" (self-only) by default even with an accepted household', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: emptyExpenses, error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    const { result } = renderHook(() => useAnalytics('month'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
    expect(result.current.isHouseholdView).toBe(false)
    expect(getHouseholdSpendingByCategory).not.toHaveBeenCalled()
  })

  it('ignores viewMode "household" without an accepted partner', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: emptyExpenses, error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('month', 'household'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
  })

  describe('household view (ADR-010/011 attribution)', () => {
    const ownSpending = [{ category_id: 'c1', name: 'Housing', icon: null, color: null, translationKey: null, amount: 5200, percentage: 40 }]
    const partnerSpending = [{ category_id: 'c1', name: 'Housing', icon: null, color: null, translationKey: null, amount: 9500, percentage: 60 }]

    beforeEach(() => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
      vi.mocked(getPeriodComparison).mockResolvedValue({
        data: { ...emptyComparison, currentTotal: 14700, previousTotal: 10000, totalPercentChange: 47, hasPreviousData: true },
        error: null,
      } as never)
      // Current period: the rent split ($5,200/$9,500). Previous period:
      // same split amounts, so buildCategoryComparison's percentChange is 0 -
      // irrelevant to what these tests check, just deterministic.
      vi.mocked(getHouseholdSpendingByCategory).mockResolvedValue({
        data: { own: ownSpending, partner: partnerSpending, ownRaw: { c1: 5200 }, partnerRaw: { c1: 9500 } },
        error: null,
      } as never)
      vi.mocked(getHouseholdTrendData).mockResolvedValue({
        data: [{ date: '2026-09-05', own: 5200, partner: 9500 }],
        error: null,
      } as never)
    })

    it('fetches combined stats and the headline comparison with both member ids together', async () => {
      renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() =>
        expect(getMonthlyStats).toHaveBeenCalledWith(expect.objectContaining({ start: expect.any(String) }), [
          'u1',
          'u2',
        ])
      )
      expect(getPeriodComparison).toHaveBeenCalledWith('month', ['u1', 'u2'])
    })

    it("fetches each member's category spend via the shared household-attributed query, for the current and previous period", async () => {
      renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(getHouseholdSpendingByCategory).toHaveBeenCalledTimes(2))
      const [[currentRange], [previousRange]] = vi.mocked(getHouseholdSpendingByCategory).mock.calls
      expect(currentRange).not.toEqual(previousRange)
      for (const call of vi.mocked(getHouseholdSpendingByCategory).mock.calls) {
        expect(call[1]).toEqual({ ownId: 'u1', partnerId: 'u2' })
      }
    })

    it('fetches the trend via the shared household-attributed query', async () => {
      renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(getHouseholdTrendData).toHaveBeenCalledWith('month', { ownId: 'u1', partnerId: 'u2' }))
    })

    it('never fuses a Case A split into one total - the breakdown keeps each member\'s own attributed amount', async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isHouseholdView).toBe(true)
      expect(result.current.householdBreakdown).toEqual({ own: ownSpending, partner: partnerSpending })
      expect(result.current.householdRaw).toEqual({ own: { c1: 5200 }, partner: { c1: 9500 } })
      expect(result.current.spendingByCategory).toEqual([])
    })

    it("stacks each member's attributed trend point into the two bar segments", async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.householdTrend).toEqual([{ date: '2026-09-05', own: 5200, partner: 9500 }])
    })

    it("keeps the comparison's headline total combined but splits its category table per member", async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.householdComparison).toMatchObject({
        currentTotal: 14700,
        previousTotal: 10000,
        totalPercentChange: 47,
        hasPreviousData: true,
        own: [expect.objectContaining({ category_id: 'c1', currentAmount: 5200 })],
        partner: [expect.objectContaining({ category_id: 'c1', currentAmount: 9500 })],
      })
    })
  })
})
