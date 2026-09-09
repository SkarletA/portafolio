import { supabase } from './supabaseClient'

export function getCategories() {
  return supabase.from('categories').select('id, name, icon, color').order('name', { ascending: true })
}
