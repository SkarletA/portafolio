export const MIN_PASSWORD_LENGTH = 8

export interface PasswordStrength {
  minLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  hasSymbol: boolean
  isValid: boolean
}

export function getPasswordStrength(password: string): PasswordStrength {
  const minLength = password.length >= MIN_PASSWORD_LENGTH
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  return {
    minLength,
    hasUppercase,
    hasNumber,
    hasSymbol,
    isValid: minLength && hasUppercase && hasNumber && hasSymbol,
  }
}
