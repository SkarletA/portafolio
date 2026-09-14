import { describe, expect, it } from 'vitest'
import { getPasswordStrength } from './password'

describe('getPasswordStrength', () => {
  it('flags every requirement as unmet for an empty password', () => {
    expect(getPasswordStrength('')).toEqual({
      minLength: false,
      hasUppercase: false,
      hasNumber: false,
      hasSymbol: false,
      isValid: false,
    })
  })

  it('is invalid when only length is satisfied', () => {
    const result = getPasswordStrength('lowercaseonly')
    expect(result.minLength).toBe(true)
    expect(result.hasUppercase).toBe(false)
    expect(result.hasNumber).toBe(false)
    expect(result.hasSymbol).toBe(false)
    expect(result.isValid).toBe(false)
  })

  it('is invalid when under the minimum length even if every other rule is met', () => {
    const result = getPasswordStrength('Ab1!')
    expect(result.minLength).toBe(false)
    expect(result.hasUppercase).toBe(true)
    expect(result.hasNumber).toBe(true)
    expect(result.hasSymbol).toBe(true)
    expect(result.isValid).toBe(false)
  })

  it('is valid when all four requirements are met', () => {
    expect(getPasswordStrength('Passw0rd!').isValid).toBe(true)
  })
})
