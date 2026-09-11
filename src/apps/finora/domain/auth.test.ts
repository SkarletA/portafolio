import { describe, expect, it } from 'vitest'
import { toAuthUser } from './auth'
import type { User } from '@supabase/supabase-js'

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    email: 'mariana@finora.app',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as User
}

describe('toAuthUser', () => {
  it('returns null for a null or undefined user', () => {
    expect(toAuthUser(null)).toBeNull()
    expect(toAuthUser(undefined)).toBeNull()
  })

  it('maps id and email, defaulting fullName/avatarUrl to null when metadata is empty', () => {
    expect(toAuthUser(buildUser())).toEqual({
      id: 'u1',
      email: 'mariana@finora.app',
      fullName: null,
      avatarUrl: null,
    })
  })

  it('reads full_name and avatar_url from user_metadata', () => {
    const user = buildUser({
      user_metadata: { full_name: 'Mariana Ruiz', avatar_url: 'https://example.com/avatar.png' },
    })

    expect(toAuthUser(user)).toEqual({
      id: 'u1',
      email: 'mariana@finora.app',
      fullName: 'Mariana Ruiz',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('ignores non-string metadata values instead of surfacing them as-is', () => {
    const user = buildUser({ user_metadata: { full_name: 42, avatar_url: false } })

    expect(toAuthUser(user)).toEqual({
      id: 'u1',
      email: 'mariana@finora.app',
      fullName: null,
      avatarUrl: null,
    })
  })

  it('falls back to a null email when the user has none', () => {
    const user = buildUser({ email: undefined })

    expect(toAuthUser(user)?.email).toBeNull()
  })
})
