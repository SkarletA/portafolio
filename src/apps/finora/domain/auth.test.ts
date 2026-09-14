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

  it('maps id and email', () => {
    expect(toAuthUser(buildUser())).toEqual({ id: 'u1', email: 'mariana@finora.app' })
  })

  it('falls back to a null email when the user has none', () => {
    const user = buildUser({ email: undefined })

    expect(toAuthUser(user)?.email).toBeNull()
  })
})
