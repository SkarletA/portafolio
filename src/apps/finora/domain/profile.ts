export type Theme = 'light' | 'dark'

export interface Profile {
  userId: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  nationality: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
  theme: Theme
}

export interface ProfileRow {
  user_id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  nationality: string | null
  date_of_birth: string | null
  avatar_url: string | null
  theme: Theme
}

export function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    nationality: row.nationality,
    dateOfBirth: row.date_of_birth,
    avatarUrl: row.avatar_url,
    theme: row.theme,
  }
}

// A short, common list plus "Other" - not exhaustive by design, matching the
// task's "select con países comunes + opción Other" ask rather than a full
// ISO-3166 list.
export const COUNTRIES = [
  'Argentina',
  'Bolivia',
  'Brazil',
  'Canada',
  'Chile',
  'Colombia',
  'Costa Rica',
  'Dominican Republic',
  'Ecuador',
  'El Salvador',
  'France',
  'Germany',
  'Guatemala',
  'Honduras',
  'Italy',
  'Mexico',
  'Nicaragua',
  'Panama',
  'Paraguay',
  'Peru',
  'Portugal',
  'Spain',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Venezuela',
  'Other',
]

// Calling code per entry in COUNTRIES - "Other" intentionally has none, so
// the phone field falls back to a plain "+" prefix.
export const COUNTRY_CALLING_CODES: Record<string, string> = {
  Argentina: '+54',
  Bolivia: '+591',
  Brazil: '+55',
  Canada: '+1',
  Chile: '+56',
  Colombia: '+57',
  'Costa Rica': '+506',
  'Dominican Republic': '+1',
  Ecuador: '+593',
  'El Salvador': '+503',
  France: '+33',
  Germany: '+49',
  Guatemala: '+502',
  Honduras: '+504',
  Italy: '+39',
  Mexico: '+52',
  Nicaragua: '+505',
  Panama: '+507',
  Paraguay: '+595',
  Peru: '+51',
  Portugal: '+351',
  Spain: '+34',
  'United Kingdom': '+44',
  'United States': '+1',
  Uruguay: '+598',
  Venezuela: '+58',
}

export const MAX_PHONE_DIGITS = 10

// Names shouldn't contain digits or symbols - letters (including accented
// ones), spaces, hyphens, and apostrophes cover real names (e.g. "Mary-Jane",
// "O'Connor") without being so strict it rejects valid ones. An empty string
// is treated as valid here; presence is a separate concern (the `required`
// attribute).
const NAME_PATTERN = /^[\p{L}\s'-]*$/u

export function isValidName(name: string): boolean {
  return NAME_PATTERN.test(name)
}
