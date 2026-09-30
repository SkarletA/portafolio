import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HouseholdProvider, useHousehold } from './HouseholdContext'
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

function renderUseHousehold() {
  return renderHook(() => useHousehold(), { wrapper: HouseholdProvider })
}

describe('HouseholdContext', () => {
  beforeEach(() => {
    vi.mocked(getHouseholdMembers).mockReset()
    vi.mocked(getHouseholdPartner).mockReset()
    vi.mocked(inviteHouseholdMember).mockReset()
    vi.mocked(acceptHouseholdInvite).mockReset()
    vi.mocked(declineHouseholdInvite).mockReset()
    vi.mocked(leaveHousehold).mockReset()
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'a@example.com' } } as never)
  })

  it('throws when used outside a HouseholdProvider', () => {
    expect(() => renderHook(() => useHousehold())).toThrow('useHousehold must be used within a HouseholdProvider')
  })

  it('has no household when neither row exists', async () => {
    mockNoHousehold()

    const { result } = renderUseHousehold()

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.ownMember).toBeNull()
    expect(result.current.partnerMember).toBeNull()
    expect(result.current.partner).toBeNull()
  })

  it('splits the members into own and partner by user id, and loads the partner profile', async () => {
    vi.mocked(getHouseholdMembers).mockResolvedValue({ data: [ownRow, partnerRow], error: null } as never)
    vi.mocked(getHouseholdPartner).mockResolvedValue({ data: partnerProfile, error: null } as never)

    const { result } = renderUseHousehold()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.ownMember).toEqual(ownRow)
    expect(result.current.partnerMember).toEqual(partnerRow)
    expect(result.current.partner).toEqual(partnerProfile)
  })

  it('does not fetch and clears loading when there is no signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never)

    const { result } = renderUseHousehold()

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getHouseholdMembers).not.toHaveBeenCalled()
  })

  it('invite() calls the RPC and refetches on success', async () => {
    mockNoHousehold()
    vi.mocked(inviteHouseholdMember).mockResolvedValue({ data: 'h1', error: null } as never)

    const { result } = renderUseHousehold()
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

    const { result } = renderUseHousehold()
    await waitFor(() => expect(result.current.loading).toBe(false))

    let success: boolean = true
    await act(async () => {
      success = await result.current.invite('nobody@example.com')
    })

    expect(success).toBe(false)
    expect(result.current.actionError).toBe('user_not_found')
    expect(getHouseholdMembers).toHaveBeenCalledTimes(1)
  })

  it('invite() falls back to a generic error for an unrecognized failure', async () => {
    mockNoHousehold()
    vi.mocked(inviteHouseholdMember).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderUseHousehold()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.invite('partner@example.com')
    })

    expect(result.current.actionError).toBe('generic')
  })

  it('accept() calls the RPC and refetches', async () => {
    mockNoHousehold()
    vi.mocked(acceptHouseholdInvite).mockResolvedValue({ data: 'h1', error: null } as never)

    const { result } = renderUseHousehold()
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

    const { result } = renderUseHousehold()
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

    const { result } = renderUseHousehold()
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.leave()
    })

    expect(leaveHousehold).toHaveBeenCalled()
    expect(getHouseholdMembers).toHaveBeenCalledTimes(2)
  })

  // Regression test for the bug this context replaces a plain hook to fix:
  // accepting from Settings' block left AppShell's banner showing until a
  // full reload, because each used its own `useHousehold()` call with
  // independent state. Two consumers under one shared HouseholdProvider -
  // the way AppShell and Settings both sit under the single provider
  // mounted in FinoraApp - must both update from one action.
  function BannerLikeConsumer() {
    const { ownMember, accept } = useHousehold()
    return (
      <div>
        <span data-testid="banner-status">{ownMember?.status ?? 'none'}</span>
        <button type="button" data-testid="banner-accept" onClick={accept}>
          accept
        </button>
      </div>
    )
  }

  function SettingsLikeConsumer() {
    const { ownMember } = useHousehold()
    return <span data-testid="settings-status">{ownMember?.status ?? 'none'}</span>
  }

  it('updates every consumer under the same provider when one of them accepts', async () => {
    vi.mocked(getHouseholdMembers).mockResolvedValueOnce({
      data: [{ ...ownRow, status: 'pending' }],
      error: null,
    } as never)
    vi.mocked(getHouseholdPartner).mockResolvedValue({ data: partnerProfile, error: null } as never)
    vi.mocked(acceptHouseholdInvite).mockResolvedValue({ data: 'h1', error: null } as never)

    render(
      <HouseholdProvider>
        <BannerLikeConsumer />
        <SettingsLikeConsumer />
      </HouseholdProvider>
    )

    await waitFor(() => expect(screen.getByTestId('banner-status')).toHaveTextContent('pending'))
    expect(screen.getByTestId('settings-status')).toHaveTextContent('pending')

    vi.mocked(getHouseholdMembers).mockResolvedValue({
      data: [{ ...ownRow, status: 'accepted' }],
      error: null,
    } as never)

    fireEvent.click(screen.getByTestId('banner-accept'))

    await waitFor(() => expect(screen.getByTestId('banner-status')).toHaveTextContent('accepted'))
    // The fix: Settings' reader sees the same update without its own action.
    expect(screen.getByTestId('settings-status')).toHaveTextContent('accepted')
  })
})
