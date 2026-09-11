import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgets } from './useBudgets'
import { getBudgets } from '../services/budgetsService'
import { getExpensesByCategory } from '../services/transactionsService'
import { getCategories } from '../services/categoriesService'

vi.mock('../services/budgetsService', () => ({
  getBudgets: vi.fn(),
}))

vi.mock('../services/transactionsService', () => ({
  getExpensesByCategory: vi.fn(),
  getCurrentMonthRange: vi.fn(() => ({ start: '2026-09-01', end: '2026-09-30', dayOfMonth: 11 })),
}))

vi.mock('../services/categoriesService', () => ({
  getCategories: vi.fn(),
}))

describe('useBudgets', () => {
  beforeEach(() => {
    vi.mocked(getBudgets).mockReset()
    vi.mocked(getExpensesByCategory).mockReset()
    vi.mocked(getCategories).mockReset()
    vi.mocked(getCategories).mockResolvedValue({ data: [], error: null } as never)
  })

  it('loads budgets successfully', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: { totals: {}, raw: {} }, error: null } as never)

    const { result } = renderHook(() => useBudgets())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getBudgets).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: { totals: {}, raw: {} }, error: null } as never)

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
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: { totals: {}, raw: {} }, error: null } as never)

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

  it('surfaces an error message and clears budgets when categories fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({ data: { totals: {}, raw: {} }, error: null } as never)
    vi.mocked(getCategories).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)

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
      data: { totals: { c1: 180 }, raw: { c1: 180 } },
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
        breakdown: [],
      },
    ])
  })

  it('returns no breakdown for a category with no subcategories', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'transport', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { transport: 40 }, raw: { transport: 40 } },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [{ id: 'transport', name: 'Transportation', icon: 'car', color: null, parent_id: null }],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets[0].breakdown).toEqual([])
  })

  it('breaks a parent-category budget down by subcategory, sorted by spend descending', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'food', monthly_limit: 500 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { food: 450 },
        raw: { meat: 150, market: 300, restaurants: 0 },
      },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [
        { id: 'food', name: 'Food', icon: 'utensils', color: '#111', parent_id: null },
        { id: 'meat', name: 'Meat', icon: 'beef', color: '#222', parent_id: 'food' },
        { id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#333', parent_id: 'food' },
        { id: 'restaurants', name: 'Restaurants', icon: 'tag', color: '#444', parent_id: 'food' },
      ],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const breakdown = result.current.budgets[0].breakdown
    expect(breakdown.map((item) => item.category_id)).toEqual(['market', 'meat', 'restaurants'])
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(450)
    expect(breakdown.find((item) => item.category_id === 'restaurants')?.amount).toBe(0)
  })

  it('adds an "Other" row for spend recorded directly on the parent category', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'food', monthly_limit: 500 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { food: 470 },
        raw: { meat: 150, market: 300, food: 20 },
      },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [
        { id: 'food', name: 'Food', icon: 'utensils', color: '#111', parent_id: null },
        { id: 'meat', name: 'Meat', icon: 'beef', color: '#222', parent_id: 'food' },
        { id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#333', parent_id: 'food' },
      ],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const breakdown = result.current.budgets[0].breakdown
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(470)
    expect(breakdown.find((item) => item.name === 'Other')?.amount).toBe(20)
  })
})
