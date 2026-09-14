import { supabase } from './supabaseClient'

export interface SignUpMetadata {
  first_name: string
  last_name: string
  phone?: string
  nationality?: string
  date_of_birth?: string
}

// Metadata is read by the on_auth_user_created trigger (raw_user_meta_data)
// to create the matching profiles row - omit optional keys entirely rather
// than sending an empty string, since the trigger casts date_of_birth to
// `date` and ''::date fails.
export function signUp(email: string, password: string, metadata: SignUpMetadata) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/finora`,
      data: metadata,
    },
  })
}

export function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

export function getSession() {
  return supabase.auth.getSession()
}

export function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/finora/reset-password`,
  })
}

export function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword })
}

// Supabase doesn't verify the current password before updateUser - re-authenticate
// with it first so a logged-in user can't change their password without knowing
// the current one.
export async function changePassword(currentPassword: string, newPassword: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user?.email) return { data: null, error: new Error('Not authenticated') }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  })

  if (reauthError) {
    return { data: null, error: new Error('Current password is incorrect') }
  }

  return supabase.auth.updateUser({ password: newPassword })
}

// Invokes the delete-account Edge Function, which verifies the caller's JWT
// server-side (with the service_role key, never exposed to the frontend) and
// deletes exactly that user. supabase-js attaches the current session token
// to functions.invoke automatically.
export function deleteAccount() {
  return supabase.functions.invoke('delete-account')
}
