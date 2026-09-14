import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhoneInput } from './PhoneInput'

describe('PhoneInput', () => {
  it('shows a plain "+" prefix when no country code is given', () => {
    render(<PhoneInput value="" onChange={vi.fn()} testId="test-phone-input" />)

    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('shows the given country calling code as a prefix', () => {
    render(<PhoneInput value="" onChange={vi.fn()} countryCode="+52" testId="test-phone-input" />)

    expect(screen.getByText('+52')).toBeInTheDocument()
  })

  it('strips non-digit characters before calling onChange', () => {
    const handleChange = vi.fn()
    render(<PhoneInput value="" onChange={handleChange} testId="test-phone-input" />)

    fireEvent.change(screen.getByTestId('test-phone-input'), { target: { value: '55-1234 abc' } })

    expect(handleChange).toHaveBeenCalledWith('551234')
  })

  it('caps the digits at the maximum length', () => {
    const handleChange = vi.fn()
    render(<PhoneInput value="" onChange={handleChange} testId="test-phone-input" />)

    fireEvent.change(screen.getByTestId('test-phone-input'), { target: { value: '12345678901234' } })

    expect(handleChange).toHaveBeenCalledWith('1234567890')
  })
})
