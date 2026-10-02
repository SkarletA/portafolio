import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDashboardSummary } from './useDashboardSummary'
import { getMonthlyStats, getSpendingByCategory } from '@services/analyticsService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/analyticsService', () => ({
  getMonthlyStats: vi.fn(),
  getSpendingByCategory: vi.fn(),
}))

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: vi.fn(),
}))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }

const emptyStats = { totalSpent: 0, totalIncome: 0, avgPerDay: 0, savingsRate: 0 }

describe('useDashboardSummary', () => {
  beforeEach(() => {
    vi.mocked(getMonthlyStats).mockReset()
    vi.mocked(getSpendingByCategory).mockReset()
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null } as never)
  })

  it('loads current-month stats and category spending using the current-month range', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({
      data: { totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 },
      error: null,
    } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({
      data: [{ category_id: 'c1', name: 'Food', icon: null, color: '#2563eb', amount: 500, percentage: 100 }],
      error: null,
    } as never)

    const { result } = renderHook(() => useDashboardSummary())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual({ totalSpent: 500, totalIncome: 1000, avgPerDay: 50, savingsRate: 50 })
    expect(result.current.spendingByCategory).toHaveLength(1)
    expect(result.current.error).toBeNull()
    expect(getMonthlyStats).toHaveBeenCalledWith(
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
      undefined
    )
    expect(getSpendingByCategory).toHaveBeenCalledWith(
      expect.objectContaining({ start: expect.any(String), end: expect.any(String) }),
      undefined
    )
  })

  it('treats an empty month as a valid, non-error state', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useDashboardSummary())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toEqual(emptyStats)
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears data when any fetch fails', async () => {
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useDashboardSummary())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stats).toBeNull()
    expect(result.current.spendingByCategory).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('combines both household members automatically once the household is accepted, with no toggle (ADR-011)', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getMonthlyStats).mockResolvedValue({ data: emptyStats, error: null } as never)
    vi.mocked(getSpendingByCategory).mockResolvedValue({ data: [], error: null } as never)

    renderHook(() => useDashboardSummary())

    await waitFor(() =>
      expect(getMonthlyStats).toHaveBeenCalledWith(expect.objectContaining({ start: expect.any(String) }), ['u1', 'u2'])
    )
    expect(getSpendingByCategory).toHaveBeenCalledWith(expect.objectContaining({ start: expect.any(String) }), [
      'u1',
      'u2',
    ])
  })
})
