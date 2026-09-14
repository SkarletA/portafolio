import { describe, expect, it } from 'vitest'
import { isValidName, toProfile, type ProfileRow } from './profile'

describe('toProfile', () => {
  it('maps a profiles row to camelCase', () => {
    const row: ProfileRow = {
      user_id: 'u1',
      first_name: 'Mariana',
      last_name: 'Ruiz',
      phone: '+1 555 0100',
      nationality: 'Mexico',
      date_of_birth: '1995-03-14',
      avatar_url: 'https://example.com/avatar.png',
    }

    expect(toProfile(row)).toEqual({
      userId: 'u1',
      firstName: 'Mariana',
      lastName: 'Ruiz',
      phone: '+1 555 0100',
      nationality: 'Mexico',
      dateOfBirth: '1995-03-14',
      avatarUrl: 'https://example.com/avatar.png',
    })
  })

  it('preserves null for unset optional fields', () => {
    const row: ProfileRow = {
      user_id: 'u1',
      first_name: null,
      last_name: null,
      phone: null,
      nationality: null,
      date_of_birth: null,
      avatar_url: null,
    }

    expect(toProfile(row)).toEqual({
      userId: 'u1',
      firstName: null,
      lastName: null,
      phone: null,
      nationality: null,
      dateOfBirth: null,
      avatarUrl: null,
    })
  })
})

describe('isValidName', () => {
  it('accepts plain letters', () => {
    expect(isValidName('Mariana')).toBe(true)
  })

  it('accepts accented letters, spaces, hyphens, and apostrophes', () => {
    expect(isValidName('María José')).toBe(true)
    expect(isValidName('Mary-Jane')).toBe(true)
    expect(isValidName("O'Connor")).toBe(true)
  })

  it('treats an empty string as valid, since presence is a separate concern', () => {
    expect(isValidName('')).toBe(true)
  })

  it('rejects names containing digits', () => {
    expect(isValidName('Maria123')).toBe(false)
  })

  it('rejects names containing other symbols', () => {
    expect(isValidName('Maria@Ruiz')).toBe(false)
  })
})
