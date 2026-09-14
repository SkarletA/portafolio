import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { PasswordStrengthHint } from '../components/molecules/PasswordStrengthHint/PasswordStrengthHint'
import { PhoneInput } from '../components/molecules/PhoneInput/PhoneInput'
import { useAuth } from '../context/AuthContext'
import { getPasswordStrength } from '../domain/password'
import { COUNTRIES, COUNTRY_CALLING_CODES, isValidName } from '../domain/profile'
import type { SignUpMetadata } from '../services/authService'
import s from './Register.module.css'

export function Register() {
  const { signUp } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastName, setLastName] = useState('')
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const handleFirstNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setFirstName(value)
    setFirstNameError(isValidName(value) ? null : "Name shouldn't contain numbers or symbols")
  }, [])

  const handleLastNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setLastName(value)
    setLastNameError(isValidName(value) ? null : "Last name shouldn't contain numbers or symbols")
  }, [])

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }, [])

  const handlePhoneChange = useCallback((digits: string) => {
    setPhone(digits)
  }, [])

  const handleNationalityChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setNationality(event.target.value)
  }, [])

  const handleDateOfBirthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDateOfBirth(event.target.value)
  }, [])

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!isValidName(firstName) || !isValidName(lastName)) {
        setError('Fix the highlighted fields before continuing')
        return
      }

      if (!passwordStrength.isValid) {
        setError('Your password does not meet the requirements below')
        return
      }

      setSubmitting(true)
      setError(null)

      // Optional fields are omitted rather than sent as empty strings - the
      // on_auth_user_created trigger casts date_of_birth to `date`, and
      // ''::date fails.
      const metadata: SignUpMetadata = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      }
      if (phone) metadata.phone = `${nationality ? (COUNTRY_CALLING_CODES[nationality] ?? '+') : ''}${phone}`
      if (nationality) metadata.nationality = nationality
      if (dateOfBirth) metadata.date_of_birth = dateOfBirth

      const { error: signUpError } = await signUp(email, password, metadata)

      setSubmitting(false)

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      setConfirmationSent(true)
    },
    [firstName, lastName, email, phone, nationality, dateOfBirth, password, passwordStrength.isValid, signUp]
  )

  if (confirmationSent) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>Check your email</h1>
        <p className={s.confirmationText}>We sent a confirmation email to {email}. Check your inbox.</p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>Create account</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.fieldRow}>
          <label className={s.field}>
            First name
            <input
              type="text"
              required
              value={firstName}
              onChange={handleFirstNameChange}
              className={s.input}
              data-testid="register-first-name-input"
            />
            {firstNameError && (
              <span role="alert" className={s.error}>
                {firstNameError}
              </span>
            )}
          </label>

          <label className={s.field}>
            Last name
            <input
              type="text"
              required
              value={lastName}
              onChange={handleLastNameChange}
              className={s.input}
              data-testid="register-last-name-input"
            />
            {lastNameError && (
              <span role="alert" className={s.error}>
                {lastNameError}
              </span>
            )}
          </label>
        </div>

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

        <div className={s.fieldRow}>
          <label className={s.field}>
            Phone <span className={s.hint}>(optional)</span>
            <PhoneInput
              value={phone}
              onChange={handlePhoneChange}
              countryCode={nationality ? COUNTRY_CALLING_CODES[nationality] : undefined}
              testId="register-phone-input"
            />
          </label>

          <label className={s.field}>
            Nationality <span className={s.hint}>(optional)</span>
            <select
              value={nationality}
              onChange={handleNationalityChange}
              className={s.select}
              data-testid="register-nationality-select"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={s.field}>
          Date of birth <span className={s.hint}>(optional)</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={handleDateOfBirthChange}
            className={s.input}
            data-testid="register-date-of-birth-input"
          />
        </label>

        <PasswordInput
          label="Password"
          value={password}
          onChange={handlePasswordChange}
          testId="register-password-input"
          required
        />
        <PasswordStrengthHint password={password} />

        {error && <p className={s.error}>{error}</p>}

        <Button id="register-submit-button" data-testid="register-submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className={s.footer}>
        Already have an account? <Link to="/finora/login" data-testid="register-login-link">Sign in</Link>
      </p>
    </section>
  )
}
