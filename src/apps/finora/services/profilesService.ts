import { supabase } from './supabaseClient'
import { toProfile, type Currency, type Language, type ProfileRow, type Theme } from '@domain/profile'

const AVATAR_BUCKET = 'avatars'

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single()

  if (error) return { data: null, error }

  return { data: toProfile(data as ProfileRow), error: null }
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  phone?: string
  nationality?: string
  dateOfBirth?: string
}

// The profiles row is created by the on_auth_user_created trigger at signup
// time - this only ever updates it, never inserts.
export async function updateProfile(input: UpdateProfileInput) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
      nationality: input.nationality,
      date_of_birth: input.dateOfBirth || null,
    })
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) return { data: null, error }

  return { data: toProfile(data as ProfileRow), error: null }
}

export async function updateTheme(theme: Theme) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase.from('profiles').update({ theme }).eq('user_id', userData.user.id)
}

export async function updateLanguage(language: Language) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase.from('profiles').update({ language }).eq('user_id', userData.user.id)
}

export async function updateCurrency(currency: Currency) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) return { data: null, error: userError }
  if (!userData.user) return { data: null, error: new Error('Not authenticated') }

  return supabase.from('profiles').update({ currency }).eq('user_id', userData.user.id)
}

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

  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('user_id', userData.user.id)
    .select()
    .single()

  if (error) return { data: null, error }

  return { data: toProfile(data as ProfileRow), error: null }
}
