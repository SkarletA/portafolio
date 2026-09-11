import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useAuth } from '../context/AuthContext'
import s from './ForgotPassword.module.css'

export function ForgotPassword() {
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
        <h1 className={s.title}>Revisa tu correo</h1>
        <p className={s.confirmationText}>
          Si existe una cuenta con {email}, te enviamos un correo para restablecer tu contraseña.
        </p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>Recuperar contraseña</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          Email
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
          {submitting ? 'Enviando…' : 'Enviar instrucciones'}
        </Button>
      </form>

      <p className={s.footer}>
        <Link to="/finora/login" data-testid="forgot-password-login-link">Volver a iniciar sesión</Link>
      </p>
    </section>
  )
}
