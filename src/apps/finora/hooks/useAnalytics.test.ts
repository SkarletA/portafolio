import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { getMonthlyStats, getPeriodComparison, getSpendingByCategory, getTrendData } from '@services/analyticsService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/analyticsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/analyticsService')>()
  return {
    // buildCategoryComparison is kept real (a pure function the hook calls
    // directly to build each member's comparison table, not mocked away) -
    // only the I/O functions below are replaced.
    buildCategoryComparison: actual.buildCategoryComparison,
    getMonthlyStats: vi.fn(),
    getSpendingByCategory: vi.fn(),
    getTrendData: vi.fn(),
    getPeriodComparison: vi.fn(),
  }
})

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

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.mocked(getMonthlyStats).mockReset()
    vi.mocked(getSpendingByCategory).mockReset()
    vi.mocked(getTrendData).mockReset()
    vi.mocked(getPeriodComparison).mockReset()
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null } as never)
  })

  it('loads stats, category spending, trend data, and comparison successfully', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({
      data: { totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 },
      error: null,
    } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({
      data: [{ category_id: 'c1', name: 'Food', icon: null, color: '#2563eb', amount: 500, percentage: 100 }],
      error: null,
    } as never)
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
    expect(result.current.spendingByCategory).toHaveLength(1)
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
    expect(getTrendData).toHaveBeenCalledWith('month', undefined)
    expect(getPeriodComparison).toHaveBeenCalledWith('month', undefined)
  })

  it('refetches with the requested period type', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('year'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('year', undefined))
    expect(getPeriodComparison).toHaveBeenCalledWith('year', undefined)
  })

  it('treats an empty period as a valid, non-error state', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
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
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
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
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    const { result } = renderHook(() => useAnalytics('month'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
    expect(result.current.isHouseholdView).toBe(false)
  })

  it('ignores viewMode "household" without an accepted partner', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('month', 'household'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
  })

  describe('household view (ADR-011)', () => {
    const ownCategory = { category_id: 'c1', name: 'Food', icon: null, color: null, translationKey: null, amount: 400, percentage: 50 }
    const partnerCategory = { category_id: 'c1', name: 'Food', icon: null, color: null, translationKey: null, amount: 600, percentage: 50 }

    beforeEach(() => {
      vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
      vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
      vi.mocked(getPeriodComparison).mockResolvedValue({
        data: { ...emptyComparison, currentTotal: 1000, previousTotal: 800, totalPercentChange: 25, hasPreviousData: true },
        error: null,
      } as never)
      // Distinguishes the caller's rows from the partner's by which single
      // id the call was widened to, the same per-member attribution the
      // household budget (PR8) already relies on.
      vi.mocked(getSpendingByCategory).mockImplementation((_range, ids) => {
        const data = ids?.[0] === 'u1' ? [ownCategory] : ids?.[0] === 'u2' ? [partnerCategory] : []
        return Promise.resolve({ data, error: null } as never)
      })
      vi.mocked(getTrendData).mockImplementation((_periodType, ids) => {
        const amount = ids?.[0] === 'u1' ? 100 : ids?.[0] === 'u2' ? 150 : 0
        return Promise.resolve({ data: [{ date: '2026-09-01', amount }], error: null } as never)
      })
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

    it("fetches each member's category spend and trend separately, never as one combined pair", async () => {
      renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', ['u1']))
      expect(getTrendData).toHaveBeenCalledWith('month', ['u2'])
      expect(getSpendingByCategory).toHaveBeenCalledWith(expect.anything(), ['u1'])
      expect(getSpendingByCategory).toHaveBeenCalledWith(expect.anything(), ['u2'])
    })

    it('splits the category breakdown into own/partner columns instead of merging them', async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.isHouseholdView).toBe(true)
      expect(result.current.householdBreakdown).toEqual({ own: [ownCategory], partner: [partnerCategory] })
      expect(result.current.spendingByCategory).toEqual([])
    })

    it("stacks each member's trend point into a combined bar height with two segments", async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.householdTrend).toEqual([{ date: '2026-09-01', own: 100, partner: 150, amount: 250 }])
    })

    it("keeps the comparison's headline total combined but splits its category table per member", async () => {
      const { result } = renderHook(() => useAnalytics('month', 'household'))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.householdComparison).toEqual({
        currentTotal: 1000,
        previousTotal: 800,
        totalPercentChange: 25,
        hasPreviousData: true,
        own: [
          {
            category_id: 'c1',
            name: 'Food',
            icon: null,
            color: null,
            translationKey: null,
            currentAmount: 400,
            previousAmount: 400,
            percentChange: 0,
          },
        ],
        partner: [
          {
            category_id: 'c1',
            name: 'Food',
            icon: null,
            color: null,
            translationKey: null,
            currentAmount: 600,
            previousAmount: 600,
            percentChange: 0,
          },
        ],
      })
    })
  })
})
