import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRefundablePurchases } from './useRefundablePurchases'
import { getRefundablePurchases } from '@services/transactionsService'
import type { RefundablePurchaseOptions } from '@domain/refund'

vi.mock('../services/transactionsService', () => ({
  getRefundablePurchases: vi.fn(),
}))

const options: RefundablePurchaseOptions = { refundDate: '2026-09-30', currentPurchaseId: null, ownRefundAmount: 0 }

describe('useRefundablePurchases', () => {
  beforeEach(() => {
    vi.mocked(getRefundablePurchases).mockReset()
  })

  it('loads the eligible purchases', async () => {
    vi.mocked(getRefundablePurchases).mockResolvedValue({
      data: [{ id: 'p1', description: 'Shoes', amount: 100, date: '2026-09-01', category_id: 'food', type: 'expense', withdrawal: null, remaining: 60 }],
      error: null,
    } as never)

    const { result } = renderHook(() => useRefundablePurchases(options))

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.purchases).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears the list', async () => {
    vi.mocked(getRefundablePurchases).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)

    const { result } = renderHook(() => useRefundablePurchases(options))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.purchases).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('refetches when the refund date changes', async () => {
    vi.mocked(getRefundablePurchases).mockResolvedValue({ data: [], error: null } as never)

    const { rerender } = renderHook((props) => useRefundablePurchases(props), { initialProps: options })

    await waitFor(() => expect(getRefundablePurchases).toHaveBeenCalledTimes(1))

    rerender({ ...options, refundDate: '2026-10-05' })

    await waitFor(() => expect(getRefundablePurchases).toHaveBeenCalledTimes(2))
    expect(getRefundablePurchases).toHaveBeenLastCalledWith({ ...options, refundDate: '2026-10-05' })
  })

  it('refetches when the reimbursement being edited or its stored amount changes', async () => {
    vi.mocked(getRefundablePurchases).mockResolvedValue({ data: [], error: null } as never)

    const { rerender } = renderHook((props) => useRefundablePurchases(props), { initialProps: options })

    await waitFor(() => expect(getRefundablePurchases).toHaveBeenCalledTimes(1))

    rerender({ ...options, currentPurchaseId: 'p1', ownRefundAmount: 40 })

    await waitFor(() => expect(getRefundablePurchases).toHaveBeenCalledTimes(2))
  })
})
