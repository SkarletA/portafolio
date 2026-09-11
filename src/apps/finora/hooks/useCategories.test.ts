import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCategories } from './useCategories'
import { getCategories } from '../services/categoriesService'

vi.mock('../services/categoriesService', () => ({
  getCategories: vi.fn(),
}))

describe('useCategories', () => {
  beforeEach(() => {
    vi.mocked(getCategories).mockReset()
  })

  it('loads categories successfully', async () => {
    vi.mocked(getCategories).mockResolvedValue({
      data: [{ id: 'c1', name: 'Food', icon: 'utensils', color: null, parent_id: null }],
      error: null,
    } as never)

    const { result } = renderHook(() => useCategories())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears categories', async () => {
    vi.mocked(getCategories).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('refetches and reflects newly created categories', async () => {
    vi.mocked(getCategories).mockResolvedValueOnce({
      data: [{ id: 'c1', name: 'Food', icon: 'utensils', color: null, parent_id: null }],
      error: null,
    } as never)

    const { result } = renderHook(() => useCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.categories).toHaveLength(1)

    vi.mocked(getCategories).mockResolvedValueOnce({
      data: [
        { id: 'c1', name: 'Food', icon: 'utensils', color: null, parent_id: null },
        { id: 'c2', name: 'Carne', icon: 'beef', color: null, parent_id: 'c1' },
      ],
      error: null,
    } as never)

    await result.current.refetch()

    await waitFor(() => expect(result.current.categories).toHaveLength(2))
  })
})
