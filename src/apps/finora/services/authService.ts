import { supabase } from './supabaseClient'

export function signUp(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/finora`,
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

export function updateProfile({ fullName }: { fullName: string }) {
  return supabase.auth.updateUser({ data: { full_name: fullName } })
}

// Supabase requires confirming an email change via a link sent to the new
// address before it takes effect - this never applies the change immediately.
// The caller should treat any non-error response as "confirmation sent", not
// as the email having already changed.
export function updateEmail(newEmail: string) {
  return supabase.auth.updateUser({ email: newEmail })
}

const AVATAR_BUCKET = 'avatars'

export async function uploadAvatar(file: File) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  // No extension in the path (contentType is passed explicitly instead), so
  // re-uploading a different image type still overwrites the same object
  // instead of leaving the previous one orphaned in storage.
  const filePath = `${userData.user.id}/avatar`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { data: null, error: uploadError }

  const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)
  // Cache-busted so the browser doesn't keep serving a stale image after a
  // re-upload to the same path.
  const avatarUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`

  return supabase.auth.updateUser({ data: { avatar_url: avatarUrl } })
}

// Invokes the delete-account Edge Function, which verifies the caller's JWT
// server-side (with the service_role key, never exposed to the frontend) and
// deletes exactly that user. supabase-js attaches the current session token
// to functions.invoke automatically.
export function deleteAccount() {
  return supabase.functions.invoke('delete-account')
}
