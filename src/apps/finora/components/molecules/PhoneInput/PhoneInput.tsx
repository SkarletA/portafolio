import { useCallback, type ChangeEvent } from 'react'
import { MAX_PHONE_DIGITS } from '@domain/profile'
import s from './PhoneInput.module.css'

interface PhoneInputProps {
  value: string
  onChange: (digits: string) => void
  countryCode?: string
  testId: string
}

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
