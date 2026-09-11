import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransaction } from './useTransaction'
import { getTransactionById } from '../services/transactionsService'

vi.mock('../services/transactionsService', () => ({
  getTransactionById: vi.fn(),
}))

describe('useTransaction', () => {
  beforeEach(() => {
    vi.mocked(getTransactionById).mockReset()
  })

  it('does not fetch when no id is given', () => {
    const { result } = renderHook(() => useTransaction(undefined))

    expect(result.current.loading).toBe(false)
    expect(result.current.transaction).toBeNull()
    expect(getTransactionById).not.toHaveBeenCalled()
  })

  it('loads a transaction by id', async () => {
    vi.mocked(getTransactionById).mockResolvedValue({ data: { id: 't1' }, error: null } as never)

    const { result } = renderHook(() => useTransaction('t1'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transaction).toEqual({ id: 't1' })
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears the transaction', async () => {
    vi.mocked(getTransactionById).mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    } as never)

    const { result } = renderHook(() => useTransaction('t1'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transaction).toBeNull()
    expect(result.current.error).toBe('Not found')
  })
})
