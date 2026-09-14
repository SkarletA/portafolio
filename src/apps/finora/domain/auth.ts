import type { User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | null
}

export function toAuthUser(user: User | null | undefined): AuthUser | null {
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}
