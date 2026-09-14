import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PasswordInput } from './PasswordInput'

describe('PasswordInput', () => {
  it('renders as a password input by default', () => {
    render(<PasswordInput label="Password" value="secret" onChange={vi.fn()} testId="test-password-input" />)

    expect(screen.getByTestId('test-password-input')).toHaveAttribute('type', 'password')
  })

  it('toggles to plain text and back when the eye icon is clicked', () => {
    render(<PasswordInput label="Password" value="secret" onChange={vi.fn()} testId="test-password-input" />)

    const toggle = screen.getByTestId('test-password-input-visibility-toggle')
    const input = screen.getByTestId('test-password-input')

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'text')

    fireEvent.click(toggle)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('calls onChange when the value changes', () => {
    const handleChange = vi.fn()
    render(<PasswordInput label="Password" value="" onChange={handleChange} testId="test-password-input" />)

    fireEvent.change(screen.getByTestId('test-password-input'), { target: { value: 'new-value' } })

    expect(handleChange).toHaveBeenCalledTimes(1)
  })
})
