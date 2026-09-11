import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { getMonthlyStats, getPeriodComparison, getSpendingByCategory, getTrendData } from '../services/analyticsService'

vi.mock('../services/analyticsService', () => ({
  getMonthlyStats: vi.fn(),
  getSpendingByCategory: vi.fn(),
  getTrendData: vi.fn(),
  getPeriodComparison: vi.fn(),
}))

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
    expect(getMonthlyStats).toHaveBeenCalledWith(expect.objectContaining({ start: expect.any(String), end: expect.any(String) }))
    expect(getTrendData).toHaveBeenCalledWith('month')
    expect(getPeriodComparison).toHaveBeenCalledWith('month')
  })

  it('refetches with the requested period type', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getTrendData).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getPeriodComparison).mockResolvedValue({ data: emptyComparison, error: null } as never)

    renderHook(() => useAnalytics('year'))

    await waitFor(() => expect(getTrendData).toHaveBeenCalledWith('year'))
    expect(getPeriodComparison).toHaveBeenCalledWith('year')
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
})
