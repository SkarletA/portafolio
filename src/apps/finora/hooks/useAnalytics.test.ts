import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { getMonthlyStats, getPeriodComparison, getSpendingByCategory, getTrendData } from '@services/analyticsService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/analyticsService', () => ({
  getMonthlyStats: vi.fn(),
  getSpendingByCategory: vi.fn(),
  getTrendData: vi.fn(),
  getPeriodComparison: vi.fn(),
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

    renderHook(() => useAnalytics('month'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
  })

  it('combines both household members when viewMode is "household"', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('month', 'household'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', ['u1', 'u2']))
    expect(getPeriodComparison).toHaveBeenCalledWith('month', ['u1', 'u2'])
  })

  it('ignores viewMode "household" without an accepted partner', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('month', 'household'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('month', undefined))
  })
})
