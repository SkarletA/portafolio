import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoalTransfers } from './useGoalTransfers'
import { getGoalTransfers } from '@services/goalsService'

vi.mock('../services/goalsService', () => ({
  getGoalTransfers: vi.fn(),
}))

const deposit = { id: 't1', goal_id: 'g1', kind: 'deposit', amount: 100, date: '2026-09-23', transaction: null }

describe('useGoalTransfers', () => {
  beforeEach(() => {
    vi.mocked(getGoalTransfers).mockReset()
  })

  it('loads nothing while no goal is given', () => {
    const { result } = renderHook(() => useGoalTransfers(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.transfers).toEqual([])
    expect(getGoalTransfers).not.toHaveBeenCalled()
  })

  it("loads a goal's transfers", async () => {
    vi.mocked(getGoalTransfers).mockResolvedValue({ data: [deposit], error: null } as never)

    const { result } = renderHook(() => useGoalTransfers('g1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getGoalTransfers).toHaveBeenCalledWith('g1')
    expect(result.current.transfers).toEqual([deposit])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message', async () => {
    vi.mocked(getGoalTransfers).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)

    const { result } = renderHook(() => useGoalTransfers('g1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('Network error')
    expect(result.current.transfers).toEqual([])
  })

  it('reloads on refetch, keeping the previous list visible meanwhile', async () => {
    vi.mocked(getGoalTransfers).mockResolvedValueOnce({ data: [deposit], error: null } as never)
    const { result } = renderHook(() => useGoalTransfers('g1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getGoalTransfers).mockResolvedValueOnce({ data: [], error: null } as never)
    act(() => result.current.refetch())

    expect(result.current.loading).toBe(true)
    expect(result.current.transfers).toEqual([deposit])
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getGoalTransfers).toHaveBeenCalledTimes(2)
    expect(result.current.transfers).toEqual([])
  })
})
