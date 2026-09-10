import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoals } from './useGoals'
import { getGoals } from '../services/goalsService'

vi.mock('../services/goalsService', () => ({
  getGoals: vi.fn(),
}))

describe('useGoals', () => {
  beforeEach(() => {
    vi.mocked(getGoals).mockReset()
  })

  it('loads goals successfully', async () => {
    vi.mocked(getGoals).mockResolvedValue({
      data: [{ id: '1', current_amount: 3500, target_amount: 5000 }],
      error: null,
    } as never)

    const { result } = renderHook(() => useGoals())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getGoals).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears goals', async () => {
    vi.mocked(getGoals).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('combines a goal with its computed percentage and remaining amount', async () => {
    vi.mocked(getGoals).mockResolvedValue({
      data: [{ id: '1', current_amount: 3500, target_amount: 5000 }],
      error: null,
    } as never)

    const { result } = renderHook(() => useGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toEqual([
      { id: '1', current_amount: 3500, target_amount: 5000, percentage: 70, remaining: 1500 },
    ])
  })
})
