import { supabase } from './supabaseClient'

// Both the caller's own row(s) and their household's, via RLS - see
// docs/adr/007-household-foundations.md. At most two rows.
export function getHouseholdMembers() {
  return supabase.from('household_members').select('*').order('created_at', { ascending: true })
}

// Name and avatar only of the other member of the caller's household -
// see docs/adr/008-household-partner-profile-visibility.md. Resolves even
// before either side has accepted.
export function getHouseholdPartner() {
  return supabase.rpc('get_household_partner').maybeSingle()
}

export function inviteHouseholdMember(email: string) {
  return supabase.rpc('invite_household_member', { p_email: email })
}

export function acceptHouseholdInvite() {
  return supabase.rpc('accept_household_invite')
}

export function declineHouseholdInvite() {
  return supabase.rpc('decline_household_invite')
}

export function leaveHousehold() {
  return supabase.rpc('leave_household')
}
