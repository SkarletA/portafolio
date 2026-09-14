import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { useAuth } from '../context/AuthContext'
import s from './Login.module.css'

export function Login() {
  const { t } = useTranslation(['auth', 'common'])
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }, [])

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      setSubmitting(true)
      setError(null)

      const { error: signInError } = await signIn(email, password)

      setSubmitting(false)

      if (signInError) {
        setError(
          signInError.message === 'Email not confirmed' ? t('auth:login.emailNotConfirmed') : signInError.message
        )
        return
      }

      navigate('/finora')
    },
    [email, password, signIn, navigate, t]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>{t('auth:login.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          {t('common:profileFields.email')}
          <input
            type="email"
            required
            value={email}
            onChange={handleEmailChange}
            className={s.input}
            data-testid="login-email-input"
          />
        </label>

        <PasswordInput
          label={t('auth:shared.password')}
          value={password}
          onChange={handlePasswordChange}
          testId="login-password-input"
          required
        />

        {error && <p className={s.error}>{error}</p>}

        <Button id="login-submit-button" data-testid="login-submit-button" type="submit" disabled={submitting}>
          {submitting ? t('auth:login.submitting') : t('auth:login.submit')}
        </Button>
      </form>

      <p className={s.footer}>
        <Link to="/finora/forgot-password" data-testid="login-forgot-password-link">
          {t('auth:login.forgotPassword')}
        </Link>
      </p>

      <p className={s.footer}>
        {t('auth:login.noAccount')}{' '}
        <Link to="/finora/register" data-testid="login-register-link">
          {t('auth:login.createAccount')}
        </Link>
      </p>
    </section>
  )
}
