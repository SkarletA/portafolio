// The stable error codes raised by invite_household_member,
// accept_household_invite, decline_household_invite and leave_household -
// see supabase/migrations/20260929120000_household_foundations.sql and
// docs/adr/007-household-foundations.md. Callers map them to their own
// messages, the same pattern as moneyMovementErrors.ts.
const CODES = [
  'not_authenticated',
  'user_not_found',
  'cannot_invite_self',
  'already_in_household',
  'invitee_already_in_household',
  'invite_not_found',
  'not_in_household',
] as const

export type HouseholdErrorCode = (typeof CODES)[number]

const KNOWN_CODES = new Set<string>(CODES)

// Raised with `raise exception using errcode = 'P0001'`.
const RAISED_EXCEPTION = 'P0001'

/** Recognizes one of the codes above in a Supabase error; null for any other error. */
export function parseHouseholdError(error: { code?: string; message?: string } | null): HouseholdErrorCode | null {
  if (!error || error.code !== RAISED_EXCEPTION || !error.message || !KNOWN_CODES.has(error.message)) return null
  return error.message as HouseholdErrorCode
}
