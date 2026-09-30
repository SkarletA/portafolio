// A household links exactly two users so they can see each other's
// transactions, budgets and goals in full (mutual read visibility, never
// write) - see docs/adr/007-household-foundations.md. Rows are written only
// through the invite/accept/decline/leave RPCs in householdsService.
export type HouseholdMemberStatus = 'pending' | 'accepted'

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  status: HouseholdMemberStatus
  invited_by: string
  created_at: string
  accepted_at: string | null
}

// The only profile fields a household partner exposes to the other member -
// see docs/adr/008-household-partner-profile-visibility.md. Never phone,
// date_of_birth, nationality or email.
export interface HouseholdPartner {
  user_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

export function getHouseholdPartnerDisplayName(partner: HouseholdPartner | null): string | null {
  if (!partner) return null
  const name = [partner.first_name, partner.last_name].filter(Boolean).join(' ')
  return name || null
}
