import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useAuth } from '../context/AuthContext'
import s from './ResetPassword.module.css'

export function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }, [])

  const handleConfirmPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres')
        return
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden')
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
    [password, confirmPassword, updatePassword]
  )

  if (done) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>Contraseña actualizada</h1>
        <p className={s.confirmationText}>Tu contraseña se actualizó correctamente.</p>
        <Link to="/finora/login" data-testid="reset-password-login-link">Ir a iniciar sesión</Link>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>Restablecer contraseña</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <label className={s.field}>
          Nueva contraseña
          <input
            type="password"
            required
            value={password}
            onChange={handlePasswordChange}
            className={s.input}
            data-testid="reset-password-password-input"
          />
        </label>

        <label className={s.field}>
          Confirmar contraseña
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            className={s.input}
            data-testid="reset-password-confirm-input"
          />
        </label>

        {error && <p className={s.error}>{error}</p>}

        <Button
          id="reset-password-submit-button"
          data-testid="reset-password-submit-button"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Actualizando…' : 'Actualizar contraseña'}
        </Button>
      </form>
    </section>
  )
}
