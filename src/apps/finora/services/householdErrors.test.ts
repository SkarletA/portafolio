import { describe, expect, it } from 'vitest'
import { parseHouseholdError } from './householdErrors'

describe('parseHouseholdError', () => {
  it.each([
    'not_authenticated',
    'user_not_found',
    'cannot_invite_self',
    'already_in_household',
    'invitee_already_in_household',
    'invite_not_found',
    'not_in_household',
  ])('reads the %s code', (code) => {
    expect(parseHouseholdError({ code: 'P0001', message: code })).toBe(code)
  })

  it('ignores other errors, including unknown raised messages', () => {
    expect(parseHouseholdError(null)).toBeNull()
    expect(parseHouseholdError({ code: 'P0001', message: 'some_other_code' })).toBeNull()
    expect(parseHouseholdError({ code: '23503', message: 'not_authenticated' })).toBeNull()
    expect(parseHouseholdError({ code: 'P0001' })).toBeNull()
  })
})
