import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { PasswordStrengthHint } from '../components/molecules/PasswordStrengthHint/PasswordStrengthHint'
import { useAuth } from '../context/AuthContext'
import { getPasswordStrength } from '../domain/password'
import s from './ResetPassword.module.css'

export function ResetPassword() {
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
        setError('Your password does not meet the requirements below')
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords don't match")
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
    [password, confirmPassword, passwordStrength.isValid, updatePassword]
  )

  if (done) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>Password updated</h1>
        <p className={s.confirmationText}>Your password was updated successfully.</p>
        <Link to="/finora/login" data-testid="reset-password-login-link">
          Go to sign in
        </Link>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>Reset password</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <PasswordInput
          label="New password"
          value={password}
          onChange={handlePasswordChange}
          testId="reset-password-password-input"
          required
        />
        <PasswordStrengthHint password={password} />

        <PasswordInput
          label="Confirm password"
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
          {submitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </section>
  )
}
