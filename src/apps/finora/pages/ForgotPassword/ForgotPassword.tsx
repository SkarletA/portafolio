import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { useAuth } from '@context/AuthContext'
import s from './ForgotPassword.module.css'

export function ForgotPassword() {
  const { t } = useTranslation(['auth', 'common'])
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      setSubmitting(true)
      setError(null)

      const { error: resetError } = await requestPasswordReset(email)

      setSubmitting(false)

      if (resetError) {
        setError(resetError.message)
        return
      }

      setResetSent(true)
    },
    [email, requestPasswordReset]
  )

  if (resetSent) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>{t('auth:shared.checkYourEmailTitle')}</h1>
        <p className={s.confirmationText}>{t('auth:forgotPassword.resetEmailSentTo', { email })}</p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>{t('auth:forgotPassword.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          {t('common:profileFields.email')}
          <input
            type="email"
            required
            value={email}
            onChange={handleEmailChange}
            className={s.input}
            data-testid="forgot-password-email-input"
          />
        </label>

        {error && <p className={s.error}>{error}</p>}

        <Button
          id="forgot-password-submit-button"
          data-testid="forgot-password-submit-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? t('auth:forgotPassword.submitting') : t('auth:forgotPassword.submit')}
        </Button>
      </form>

      <p className={s.footer}>
        <Link to="/finora/login" data-testid="forgot-password-login-link">
          {t('auth:forgotPassword.backToSignIn')}
        </Link>
      </p>
    </section>
  )
}
