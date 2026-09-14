import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfile } from './useProfile'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '../services/profilesService'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../services/profilesService', () => ({
  getProfile: vi.fn(),
}))

const baseProfile = {
  userId: 'u1',
  firstName: 'Mariana',
  lastName: 'Ruiz',
  phone: null,
  nationality: null,
  dateOfBirth: null,
  avatarUrl: null,
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.mocked(getProfile).mockReset()
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'u1', email: 'mariana@finora.app' } } as never)
  })

  it('loads the current user profile', async () => {
    vi.mocked(getProfile).mockResolvedValue({ data: baseProfile, error: null } as never)

    const { result } = renderHook(() => useProfile())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.profile).toEqual(baseProfile)
    expect(result.current.error).toBeNull()
    expect(getProfile).toHaveBeenCalledWith('u1')
  })

  it('surfaces an error message and clears the profile when the fetch fails', async () => {
    vi.mocked(getProfile).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)

    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBe('Network error')
  })

  it('does not fetch and clears loading when there is no signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never)

    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.profile).toBeNull()
    expect(getProfile).not.toHaveBeenCalled()
  })
})
