import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { useAuth } from '../context/AuthContext'
import s from './Login.module.css'

export function Login() {
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
          signInError.message === 'Email not confirmed'
            ? 'Confirm your email before signing in'
            : signInError.message
        )
        return
      }

      navigate('/finora')
    },
    [email, password, signIn, navigate]
  )

  return (
    <section className={s.section}>
      <h1 className={s.title}>Sign in</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          Email
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
          label="Password"
          value={password}
          onChange={handlePasswordChange}
          testId="login-password-input"
          required
        />

        {error && <p className={s.error}>{error}</p>}

        <Button id="login-submit-button" data-testid="login-submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className={s.footer}>
        <Link to="/finora/forgot-password" data-testid="login-forgot-password-link">
          Forgot your password?
        </Link>
      </p>

      <p className={s.footer}>
        Don&apos;t have an account? <Link to="/finora/register" data-testid="login-register-link">Create account</Link>
      </p>
    </section>
  )
}
