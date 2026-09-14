import cn from 'clsx'
import { getPasswordStrength } from '../../../domain/password'
import s from './PasswordStrengthHint.module.css'

interface PasswordStrengthHintProps {
  password: string
}

const REQUIREMENTS = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUppercase', label: 'One uppercase letter' },
  { key: 'hasNumber', label: 'One number' },
  { key: 'hasSymbol', label: 'One symbol (e.g. ! @ # $ %)' },
] as const

export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  const strength = getPasswordStrength(password)

  return (
    <ul className={s.list}>
      {REQUIREMENTS.map((requirement) => (
        <li key={requirement.key} className={cn(s.item, strength[requirement.key] && s.met)}>
          {requirement.label}
        </li>
      ))}
    </ul>
  )
}
