import cn from 'clsx'
import { useTranslation } from 'react-i18next'
import { getPasswordStrength } from '@domain/password'
import s from './PasswordStrengthHint.module.css'

interface PasswordStrengthHintProps {
  /** The password to check against each requirement as the user types. */
  password: string
}

const REQUIREMENTS = ['minLength', 'hasUppercase', 'hasNumber', 'hasSymbol'] as const

/** A checklist of password requirements, each marked met or unmet as the user types. */
export function PasswordStrengthHint({ password }: PasswordStrengthHintProps) {
  const { t } = useTranslation('auth')
  const strength = getPasswordStrength(password)

  return (
    <ul className={s.list}>
      {REQUIREMENTS.map((requirement) => (
        <li key={requirement} className={cn(s.item, strength[requirement] && s.met)}>
          {t(`passwordStrength.${requirement}`)}
        </li>
      ))}
    </ul>
  )
}
