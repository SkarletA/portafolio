import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@services/supabaseClient'
import { requestPasswordReset, signUp } from '@services/authService'

vi.mock('@services/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

// Redirects are built from window.location.origin on purpose, so each environment
// (local, preview, production) sends the email link back to itself. The expected
// values are derived the same way here instead of hardcoding a domain.
const origin = window.location.origin

const metadata = { first_name: 'Ada', last_name: 'Lovelace' }

describe('authService redirects', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {}, error: null } as never)
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null } as never)
  })

  it('signUp sends the confirmation link to the Finora app root', async () => {
    await signUp('ada@example.com', 'Str0ng!Pass', metadata)

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'Str0ng!Pass',
      options: {
        emailRedirectTo: `${origin}/finora`,
        data: metadata,
      },
    })
  })

  it('requestPasswordReset sends the recovery link to the Finora reset-password page', async () => {
    await requestPasswordReset('ada@example.com')

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('ada@example.com', {
      redirectTo: `${origin}/finora/reset-password`,
    })
  })
})
