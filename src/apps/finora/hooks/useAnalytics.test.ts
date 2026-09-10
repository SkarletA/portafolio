import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalytics } from './useAnalytics'
import { getDailySpending, getMonthlyStats, getSpendingByCategory } from '../services/analyticsService'

vi.mock('../services/analyticsService', () => ({
  getMonthlyStats: vi.fn(),
  getSpendingByCategory: vi.fn(),
  getDailySpending: vi.fn(),
}))

const emptyStats = { totalSpent: 0, totalIncome: 0, avgPerDay: 0, savingsRate: 0 }

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.mocked(getMonthlyStats).mockReset()
    vi.mocked(getSpendingByCategory).mockReset()
    vi.mocked(getDailySpending).mockReset()
  })

  it('loads stats, category spending, and daily spending successfully', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({
      data: { totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 },
      error: null,
    } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({
      data: [{ category_id: 'c1', name: 'Food', icon: null, color: '#2563eb', amount: 500, percentage: 100 }],
      error: null,
    } as never)
    vi.mocked(getDailySpending).mockResolvedValue({
      data: [{ date: '2026-09-01', amount: 500 }],
      error: null,
    } as never)

    const { result } = renderHook(() => useAnalytics())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual({ totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 })
    expect(result.current.spendingByCategory).toHaveLength(1)
    expect(result.current.dailySpending).toEqual([{ date: '2026-09-01', amount: 500 }])
    expect(result.current.error).toBeNull()
  })

  it('treats an empty month as a valid, non-error state', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getDailySpending).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual(emptyStats)
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.dailySpending).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears data when any fetch fails', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getDailySpending).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useAnalytics())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toBeNull()
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.dailySpending).toEqual([])
    expect(result.current.error).toBe('Network error')
  })
})
