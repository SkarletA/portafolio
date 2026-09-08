import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useAuth } from '../context/AuthContext'
import s from './Register.module.css'

export function Register() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

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

      const { error: signUpError } = await signUp(email, password)

      setSubmitting(false)

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setConfirmationSent(true)
    },
    [email, password, signUp]
  )

  if (confirmationSent) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>Revisa tu correo</h1>
        <p className={s.confirmationText}>
          Te enviamos un correo de confirmación a {email}. Revisa tu bandeja de entrada.
        </p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>Crear cuenta</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={handleEmailChange}
            className={s.input}
            data-testid="register-email-input"
          />
        </label>

        <label className={s.field}>
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={handlePasswordChange}
            className={s.input}
            data-testid="register-password-input"
          />
        </label>

        {error && <p className={s.error}>{error}</p>}

        <Button id="register-submit-button" data-testid="register-submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className={s.footer}>
        ¿Ya tenés cuenta? <Link to="/finora/login" data-testid="register-login-link">Iniciar sesión</Link>
      </p>
    </section>
  )
}
