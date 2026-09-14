import { supabase } from './supabaseClient'

export function getCategories() {
  return supabase
    .from('categories')
    .select('id, name, icon, color, parent_id, translationKey:translation_key')
    .order('name', { ascending: true })
}

export interface NewCategoryInput {
  name: string
  icon: string
  color: string
  parent_id?: string | null
}

export async function createCategory(data: NewCategoryInput) {
  const trimmedName = data.name.trim()
  const parentId = data.parent_id ?? null

  const siblingsQuery = supabase.from('categories').select('id, name')
  const { data: siblings, error: siblingsError } = await (parentId === null
    ? siblingsQuery.is('parent_id', null)
    : siblingsQuery.eq('parent_id', parentId))

  if (siblingsError) return { data: null, error: siblingsError }

  const isDuplicate = (siblings ?? []).some((sibling) => sibling.name.toLowerCase() === trimmedName.toLowerCase())

  if (isDuplicate) {
    return {
      data: null,
      error: new Error(`A category named "${trimmedName}" already exists${parentId ? ' under this parent' : ''}.`),
    }
  }

  // translation_key is intentionally never set here - it only exists on the
  // seed categories, so a user-created category always displays its raw name.
  return supabase
    .from('categories')
    .insert({ name: trimmedName, icon: data.icon, color: data.color, parent_id: parentId })
    .select()
    .single()
}
