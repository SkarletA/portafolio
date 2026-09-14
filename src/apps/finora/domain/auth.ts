import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
  }
}
