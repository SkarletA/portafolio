import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactions } from './useTransactions'
import { getTransactions } from '../services/transactionsService'

vi.mock('../services/transactionsService', () => ({
  getTransactions: vi.fn(),
}))

describe('useTransactions', () => {
  beforeEach(() => {
    vi.mocked(getTransactions).mockReset()
  })

  it('loads transactions successfully', async () => {
    vi.mocked(getTransactions).mockResolvedValue({ data: [{ id: '1' }], error: null } as never)

    const { result } = renderHook(() => useTransactions())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transactions).toEqual([{ id: '1' }])
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getTransactions).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useTransactions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transactions).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears transactions', async () => {
    vi.mocked(getTransactions).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useTransactions())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transactions).toEqual([])
    expect(result.current.error).toBe('Network error')
  })
})
