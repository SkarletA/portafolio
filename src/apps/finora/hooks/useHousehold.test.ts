import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHousehold } from './useHousehold'
import { useAuth } from '@context/AuthContext'
import {
  acceptHouseholdInvite,
  declineHouseholdInvite,
  getHouseholdMembers,
  getHouseholdPartner,
  inviteHouseholdMember,
  leaveHousehold,
} from '@services/householdsService'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../services/householdsService', () => ({
  getHouseholdMembers: vi.fn(),
  getHouseholdPartner: vi.fn(),
  inviteHouseholdMember: vi.fn(),
  acceptHouseholdInvite: vi.fn(),
  declineHouseholdInvite: vi.fn(),
  leaveHousehold: vi.fn(),
}))

const ownRow = {
  id: 'm1',
  household_id: 'h1',
  user_id: 'u1',
  status: 'accepted' as const,
  invited_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  accepted_at: '2026-01-01T00:00:00Z',
}

const partnerRow = {
  id: 'm2',
  household_id: 'h1',
  user_id: 'u2',
  status: 'pending' as const,
  invited_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  accepted_at: null,
}

const partnerProfile = { user_id: 'u2', first_name: 'Bel', last_name: 'Suarez', avatar_url: null }

function mockNoHousehold() {
  vi.mocked(getHouseholdMembers).mockResolvedValue({ data: [], error: null } as never)
  vi.mocked(getHouseholdPartner).mockResolvedValue({ data: null, error: null } as never)
}

describe('useHousehold', () => {
  beforeEach(() => {
    vi.mocked(getHouseholdMembers).mockReset()
    vi.mocked(getHouseholdPartner).mockReset()
    vi.mocked(inviteHouseholdMember).mockReset()
    vi.mocked(acceptHouseholdInvite).mockReset()
    vi.mocked(declineHouseholdInvite).mockReset()
    vi.mocked(leaveHousehold).mockReset()
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@example.com' } } as never)
  })

  it('has no household when neither row exists', async () => {
    mockNoHousehold()

    const { result } = renderHook(() => useHousehold())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.ownMember).toBeNull()
    expect(result.current.partnerMember).toBeNull()
    expect(result.current.partner).toBeNull()
  })

  it('splits the members into own and partner by user id, and loads the partner profile', async () => {
    vi.mocked(getHouseholdMembers).mockResolvedValue({ data: [ownRow, partnerRow], error: null } as never)
    vi.mocked(getHouseholdPartner).mockResolvedValue({ data: partnerProfile, error: null } as never)

    const { result } = renderHook(() => useHousehold())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.ownMember).toEqual(ownRow)
    expect(result.current.partnerMember).toEqual(partnerRow)
    expect(result.current.partner).toEqual(partnerProfile)
  })

  it('does not fetch and clears loading when there is no signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never)

    const { result } = renderHook(() => useHousehold())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getHouseholdMembers).not.toHaveBeenCalled()
  })

  it('invite() calls the RPC and refetches on success', async () => {
    mockNoHousehold()
    vi.mocked(inviteHouseholdMember).mockResolvedValue({ data: 'h1', error: null } as never)

    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = false
    await act(async () => {
      success = await result.current.invite('partner@example.com')
    })

    expect(success).toBe(true)
    expect(inviteHouseholdMember).toHaveBeenCalledWith('partner@example.com')
    expect(getHouseholdMembers).toHaveBeenCalledTimes(2)
    expect(result.current.actionError).toBeNull()
  })

  it('invite() surfaces a known error code and does not refetch', async () => {
    mockNoHousehold()
    vi.mocked(inviteHouseholdMember).mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'user_not_found' },
    } as never)

    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = true
    await act(async () => {
      success = await result.current.invite('nobody@example.com')
    })

    expect(success).toBe(false)
    expect(result.current.actionError).toBe('user_not_found')
    expect(getHouseholdMembers).toHaveBeenCalledTimes(1)
  })

  it('accept() calls the RPC and refetches', async () => {
    mockNoHousehold()
    vi.mocked(acceptHouseholdInvite).mockResolvedValue({ data: 'h1', error: null } as never)

    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.accept()
    })

    expect(acceptHouseholdInvite).toHaveBeenCalled()
    expect(getHouseholdMembers).toHaveBeenCalledTimes(2)
  })

  it('decline() calls the RPC and refetches', async () => {
    mockNoHousehold()
    vi.mocked(declineHouseholdInvite).mockResolvedValue({ data: null, error: null } as never)

    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.decline()
    })

    expect(declineHouseholdInvite).toHaveBeenCalled()
    expect(getHouseholdMembers).toHaveBeenCalledTimes(2)
  })

  it('leave() calls the RPC and refetches', async () => {
    mockNoHousehold()
    vi.mocked(leaveHousehold).mockResolvedValue({ data: null, error: null } as never)

    const { result } = renderHook(() => useHousehold())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.leave()
    })

    expect(leaveHousehold).toHaveBeenCalled()
    expect(getHouseholdMembers).toHaveBeenCalledTimes(2)
  })
})
