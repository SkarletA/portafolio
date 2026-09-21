import { useCallback, type ChangeEvent } from 'react'
import { MAX_PHONE_DIGITS } from '@domain/profile'
import s from './PhoneInput.module.css'

interface PhoneInputProps {
  /** Digits only, no country code. */
  value: string
  /** Receives the new value already stripped to digits, capped at MAX_PHONE_DIGITS. */
  onChange: (digits: string) => void
  /** Calling code shown as a fixed prefix, e.g. "+52"; falls back to a plain "+" when unknown. */
  countryCode?: string
  testId: string
}

/** A phone number field with a fixed, non-editable country calling-code prefix. */
export function PhoneInput({ value, onChange, countryCode, testId }: PhoneInputProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS))
    },
    [onChange]
  )

  return (
    <div className={s.wrap}>
      <span className={s.prefix}>{countryCode || '+'}</span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        className={s.input}
        data-testid={testId}
      />
    </div>
  )
}
