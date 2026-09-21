import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/atoms/Button/Button'
import { PasswordInput } from '@components/molecules/PasswordInput/PasswordInput'
import { PasswordStrengthHint } from '@components/molecules/PasswordStrengthHint/PasswordStrengthHint'
import { useAuth } from '../context/AuthContext'
import { getPasswordStrength } from '@domain/password'
import s from './ResetPassword.module.css'

export function ResetPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }, [])

  const handleConfirmPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!passwordStrength.isValid) {
        setError(t('auth:shared.passwordRequirementsNotMet'))
        return
      }

      if (password !== confirmPassword) {
        setError(t('common:validation.passwordsDontMatch'))
        return
      }

      setSubmitting(true)
      setError(null)

      const { error: updateError } = await updatePassword(password)

      setSubmitting(false)

      if (updateError) {
        setError(updateError.message)
        return
      }

      setDone(true)
    },
    [password, confirmPassword, passwordStrength.isValid, updatePassword, t]
  )

  if (done) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>{t('auth:resetPassword.successTitle')}</h1>
        <p className={s.confirmationText}>{t('auth:resetPassword.successText')}</p>
        <Link to="/finora/login" data-testid="reset-password-login-link">
          {t('auth:resetPassword.goToSignIn')}
        </Link>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>{t('auth:resetPassword.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <PasswordInput
          label={t('auth:resetPassword.newPassword')}
          value={password}
          onChange={handlePasswordChange}
          testId="reset-password-password-input"
          required
        />
        <PasswordStrengthHint password={password} />

        <PasswordInput
          label={t('auth:resetPassword.confirmPassword')}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          testId="reset-password-confirm-input"
          required
        />

        {error && <p className={s.error}>{error}</p>}

        <Button
          id="reset-password-submit-button"
          data-testid="reset-password-submit-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('auth:resetPassword.submitting') : t('auth:resetPassword.submit')}
        </Button>
      </form>
    </section>
  )
}
