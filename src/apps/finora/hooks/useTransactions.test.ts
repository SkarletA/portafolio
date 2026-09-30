import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTransactions } from './useTransactions'
import { getTransactions } from '@services/transactionsService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/transactionsService', () => ({
  getTransactions: vi.fn(),
}))

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: vi.fn(),
}))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }

describe('useTransactions', () => {
  beforeEach(() => {
    vi.mocked(getTransactions).mockReset()
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null } as never)
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

  it('fetches only the caller when there is no household', async () => {
    vi.mocked(getTransactions).mockResolvedValue({ data: [], error: null } as never)

    renderHook(() => useTransactions())

    await waitFor(() => expect(getTransactions).toHaveBeenCalledWith(undefined))
  })

  it('fetches only the caller while the partner has not accepted yet', async () => {
    vi.mocked(useHousehold).mockReturnValue({
      ownMember: acceptedOwn,
      partnerMember: { ...acceptedPartner, status: 'pending' },
    } as never)
    vi.mocked(getTransactions).mockResolvedValue({ data: [], error: null } as never)

    renderHook(() => useTransactions())

    await waitFor(() => expect(getTransactions).toHaveBeenCalledWith(undefined))
  })

  it('fetches both household members once accepted', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getTransactions).mockResolvedValue({ data: [], error: null } as never)

    renderHook(() => useTransactions())

    await waitFor(() => expect(getTransactions).toHaveBeenCalledWith(['u1', 'u2']))
  })
})
