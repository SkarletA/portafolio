export interface Profile {
  userId: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  nationality: string | null
  dateOfBirth: string | null
  avatarUrl: string | null
}

export interface ProfileRow {
  user_id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  nationality: string | null
  date_of_birth: string | null
  avatar_url: string | null
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
