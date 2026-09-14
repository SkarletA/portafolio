import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrengthHint } from './PasswordStrengthHint'

describe('PasswordStrengthHint', () => {
  it('renders all four requirements as unmet for an empty password', () => {
    render(<PasswordStrengthHint password="" />)

    expect(screen.getByText('At least 8 characters')).not.toHaveClass('met')
    expect(screen.getByText('One uppercase letter')).not.toHaveClass('met')
    expect(screen.getByText('One number')).not.toHaveClass('met')
    expect(screen.getByText('One symbol (e.g. ! @ # $ %)')).not.toHaveClass('met')
  })

  it('marks only the requirements that are met', () => {
    render(<PasswordStrengthHint password="lowercase1" />)

    expect(screen.getByText('At least 8 characters').className).toContain('met')
    expect(screen.getByText('One number').className).toContain('met')
    expect(screen.getByText('One uppercase letter').className).not.toContain('met')
    expect(screen.getByText('One symbol (e.g. ! @ # $ %)').className).not.toContain('met')
  })

  it('marks every requirement as met for a valid password', () => {
    render(<PasswordStrengthHint password="Passw0rd!" />)

    expect(screen.getByText('At least 8 characters').className).toContain('met')
    expect(screen.getByText('One uppercase letter').className).toContain('met')
    expect(screen.getByText('One number').className).toContain('met')
    expect(screen.getByText('One symbol (e.g. ! @ # $ %)').className).toContain('met')
  })
})
