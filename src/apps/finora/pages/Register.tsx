import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { Select } from '@atoms/Select/Select'
import { PasswordInput } from '@molecules/PasswordInput/PasswordInput'
import { PasswordStrengthHint } from '@molecules/PasswordStrengthHint/PasswordStrengthHint'
import { PhoneInput } from '@molecules/PhoneInput/PhoneInput'
import { useAuth } from '@context/AuthContext'
import { getPasswordStrength } from '@domain/password'
import { COUNTRIES, COUNTRY_CALLING_CODES, isValidName } from '@domain/profile'
import type { SignUpMetadata } from '@services/authService'
import s from './Register.module.css'

const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({ value: country, label: country }))

export function Register() {
  const { t } = useTranslation(['auth', 'common'])
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

  const handleFirstNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setFirstName(value)
      setFirstNameError(
        isValidName(value)
          ? null
          : t('common:validation.invalidNameField', { field: t('common:profileFields.firstName') })
      )
    },
    [t]
  )

  const handleLastNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setLastName(value)
      setLastNameError(
        isValidName(value)
          ? null
          : t('common:validation.invalidNameField', { field: t('common:profileFields.lastName') })
      )
    },
    [t]
  )

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
  }, [])

  const handlePhoneChange = useCallback((digits: string) => {
    setPhone(digits)
  }, [])

  const handleNationalityChange = useCallback((nextNationality: string) => {
    setNationality(nextNationality)
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
        setError(t('common:validation.fixHighlightedFields'))
        return
      }

      if (!passwordStrength.isValid) {
        setError(t('auth:shared.passwordRequirementsNotMet'))
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
    [firstName, lastName, email, phone, nationality, dateOfBirth, password, passwordStrength.isValid, signUp, t]
  )

  if (confirmationSent) {
    return (
      <section className={s.sectionCentered}>
        <h1 className={s.title}>{t('auth:shared.checkYourEmailTitle')}</h1>
        <p className={s.confirmationText}>{t('auth:register.confirmationSentTo', { email })}</p>
      </section>
    )
  }

  return (
    <section className={s.section}>
      <h1 className={s.title}>{t('auth:register.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form}>
        <div className={s.fieldRow}>
          <label className={s.field}>
            {t('common:profileFields.firstName')}
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
            {t('common:profileFields.lastName')}
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
          {t('common:profileFields.email')}
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
            {t('common:profileFields.phone')} <span className={s.hint}>{t('common:profileFields.optional')}</span>
            <PhoneInput
              value={phone}
              onChange={handlePhoneChange}
              countryCode={nationality ? COUNTRY_CALLING_CODES[nationality] : undefined}
              testId="register-phone-input"
            />
          </label>

          <label className={s.field}>
            {t('common:profileFields.nationality')}{' '}
            <span className={s.hint}>{t('common:profileFields.optional')}</span>
            <Select
              options={COUNTRY_OPTIONS}
              value={nationality}
              onChange={handleNationalityChange}
              placeholder={t('common:profileFields.selectCountry')}
              testId="register-nationality-select"
            />
          </label>
        </div>

        <label className={s.field}>
          {t('common:profileFields.dateOfBirth')}{' '}
          <span className={s.hint}>{t('common:profileFields.optional')}</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={handleDateOfBirthChange}
            className={s.input}
            data-testid="register-date-of-birth-input"
          />
        </label>

        <PasswordInput
          label={t('auth:shared.password')}
          value={password}
          onChange={handlePasswordChange}
          testId="register-password-input"
          required
        />
        <PasswordStrengthHint password={password} />

        {error && <p className={s.error}>{error}</p>}

        <Button id="register-submit-button" data-testid="register-submit-button" type="submit" disabled={submitting}>
          {submitting ? t('auth:register.submitting') : t('auth:register.submit')}
        </Button>
      </form>

      <p className={s.footer}>
        {t('auth:register.hasAccount')}{' '}
        <Link to="/finora/login" data-testid="register-login-link">
          {t('auth:register.signIn')}
        </Link>
      </p>
    </section>
  )
}
