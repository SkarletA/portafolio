import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgets } from './useBudgets'
import { getBudgets } from '../services/budgetsService'
import { getExpensesByCategory } from '../services/transactionsService'

vi.mock('../services/budgetsService', () => ({
  getBudgets: vi.fn(),
}))

vi.mock('../services/transactionsService', () => ({
  getExpensesByCategory: vi.fn(),
  getCurrentMonthRange: vi.fn(() => ({ start: '2026-09-01', end: '2026-09-30', dayOfMonth: 11 })),
}))

describe('useBudgets', () => {
  beforeEach(() => {
    vi.mocked(getBudgets).mockReset()
    vi.mocked(getExpensesByCategory).mockReset()
  })

  it('loads budgets successfully', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: {}, error: null } as never)

    const { result } = renderHook(() => useBudgets())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getBudgets).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: {}, error: null } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears budgets when budgets fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: {}, error: null } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('surfaces an error message and clears budgets when expenses fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('combines a budget with its month-to-date spend and derives percentage/status', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 200 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { c1: 180 },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([
      {
        id: '1',
        category_id: 'c1',
        monthly_limit: 200,
        spent: 180,
        percentage: 90,
        status: 'near-limit',
      },
    ])
  })
})
