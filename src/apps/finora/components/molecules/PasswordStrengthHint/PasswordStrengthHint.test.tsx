import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrengthHint } from './PasswordStrengthHint'

describe('PasswordStrengthHint', () => {
  it('renders all four requirements as unmet for an empty password', () => {
    render(<PasswordStrengthHint password="" />)

    expect(screen.getByText('passwordStrength.minLength')).not.toHaveClass('met')
    expect(screen.getByText('passwordStrength.hasUppercase')).not.toHaveClass('met')
    expect(screen.getByText('passwordStrength.hasNumber')).not.toHaveClass('met')
    expect(screen.getByText('passwordStrength.hasSymbol')).not.toHaveClass('met')
  })

  it('marks only the requirements that are met', () => {
    render(<PasswordStrengthHint password="lowercase1" />)

    expect(screen.getByText('passwordStrength.minLength').className).toContain('met')
    expect(screen.getByText('passwordStrength.hasNumber').className).toContain('met')
    expect(screen.getByText('passwordStrength.hasUppercase').className).not.toContain('met')
    expect(screen.getByText('passwordStrength.hasSymbol').className).not.toContain('met')
  })

  it('marks every requirement as met for a valid password', () => {
    render(<PasswordStrengthHint password="Passw0rd!" />)

    expect(screen.getByText('passwordStrength.minLength').className).toContain('met')
    expect(screen.getByText('passwordStrength.hasUppercase').className).toContain('met')
    expect(screen.getByText('passwordStrength.hasNumber').className).toContain('met')
    expect(screen.getByText('passwordStrength.hasSymbol').className).toContain('met')
  })
})
