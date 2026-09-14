import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useProfile } from '../hooks/useProfile'
import { updateProfile, uploadAvatar } from '../services/profilesService'
import { Avatar } from '../components/atoms/Avatar/Avatar'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { PhoneInput } from '../components/molecules/PhoneInput/PhoneInput'
import { COUNTRIES, COUNTRY_CALLING_CODES, isValidName } from '../domain/profile'
import type { Language } from '../domain/profile'
import s from './Settings.module.css'

const DELETE_CONFIRMATION_KEYWORD = 'DELETE'
const MIN_PASSWORD_LENGTH = 6

const PREFERENCE_ITEMS = [
  {
    key: 'weekly-summary',
    labelKey: 'preferences.weeklySummary.label',
    descriptionKey: 'preferences.weeklySummary.description',
    defaultOn: true,
  },
  {
    key: 'budget-alerts',
    labelKey: 'preferences.budgetAlerts.label',
    descriptionKey: 'preferences.budgetAlerts.description',
    defaultOn: true,
  },
] as const

const LANGUAGE_OPTIONS: { value: Language; labelKey: string }[] = [
  { value: 'en', labelKey: 'preferences.language.en' },
  { value: 'es', labelKey: 'preferences.language.es' },
]

export function Settings() {
  const { t } = useTranslation(['settings', 'common'])
  const { user, changePassword, deleteAccount, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const { profile, refetch: refetchProfile } = useProfile()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastName, setLastName] = useState('')
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [nationality, setNationality] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const canConfirmDelete =
    deleteConfirmationText.trim() === DELETE_CONFIRMATION_KEYWORD ||
    (!!user?.email && deleteConfirmationText.trim().toLowerCase() === user.email.toLowerCase())

  useEffect(() => {
    if (!profile) return
    setFirstName(profile.firstName ?? '')
    setLastName(profile.lastName ?? '')
    // The stored phone may include a calling code from a previous save -
    // the input only ever edits the local digits, so strip anything that
    // isn't a digit and keep at most the last MAX_PHONE_DIGITS of it.
    setPhone((profile.phone ?? '').replace(/\D/g, '').slice(-10))
    setNationality(profile.nationality ?? '')
    setDateOfBirth(profile.dateOfBirth ?? '')
  }, [profile])

  useEffect(() => {
    if (isDeleteModalOpen) deleteInputRef.current?.focus()
  }, [isDeleteModalOpen])

  const handleFirstNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setFirstName(value)
      setFirstNameError(
        isValidName(value)
          ? null
          : t('common:validation.invalidNameField', { field: t('common:profileFields.firstName') })
      )
      setProfileSuccess(false)
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
      setProfileSuccess(false)
    },
    [t]
  )

  const handlePhoneChange = useCallback((digits: string) => {
    setPhone(digits)
    setProfileSuccess(false)
  }, [])

  const handleNationalityChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setNationality(event.target.value)
    setProfileSuccess(false)
  }, [])

  const handleDateOfBirthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDateOfBirth(event.target.value)
    setProfileSuccess(false)
  }, [])

  const handleSaveProfile = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!isValidName(firstName) || !isValidName(lastName)) {
        setProfileError(t('common:validation.fixHighlightedFieldsSaving'))
        return
      }

      setSavingProfile(true)
      setProfileError(null)
      setProfileSuccess(false)

      const countryCode = nationality ? (COUNTRY_CALLING_CODES[nationality] ?? '+') : ''

      const { error } = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? `${countryCode}${phone}` : '',
        nationality,
        dateOfBirth,
      })

      setSavingProfile(false)

      if (error) {
        setProfileError(error.message)
        return
      }

      setProfileSuccess(true)
      refetchProfile()
    },
    [firstName, lastName, phone, nationality, dateOfBirth, refetchProfile, t]
  )

  const handleChangePhotoClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleAvatarFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      setUploadingAvatar(true)
      setAvatarError(null)

      const { error } = await uploadAvatar(file)

      setUploadingAvatar(false)

      if (error) {
        setAvatarError(error.message)
        return
      }

      refetchProfile()
    },
    [refetchProfile]
  )

  const handleCurrentPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCurrentPassword(event.target.value)
  }, [])

  const handleNewPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(event.target.value)
  }, [])

  const handleConfirmNewPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setConfirmNewPassword(event.target.value)
  }, [])

  const handleChangePassword = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setPasswordError(t('common:validation.passwordMinLength', { count: MIN_PASSWORD_LENGTH }))
        return
      }

      if (newPassword !== confirmNewPassword) {
        setPasswordError(t('common:validation.passwordsDontMatch'))
        return
      }

      setChangingPassword(true)
      setPasswordError(null)
      setPasswordSuccess(false)

      const { error } = await changePassword(currentPassword, newPassword)

      setChangingPassword(false)

      if (error) {
        setPasswordError(error.message)
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordSuccess(true)
    },
    [currentPassword, newPassword, confirmNewPassword, changePassword, t]
  )

  const handleThemeToggle = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleLanguageButtonClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const nextLanguage = event.currentTarget.dataset.language as Language | undefined
      if (nextLanguage) setLanguage(nextLanguage)
    },
    [setLanguage]
  )

  const handleOpenDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(true)
    setDeleteConfirmationText('')
    setDeleteError(null)
  }, [])

  const handleCloseDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false)
  }, [])

  const handleDeleteModalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseDeleteModal()
    },
    [handleCloseDeleteModal]
  )

  const handleDeleteConfirmationChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDeleteConfirmationText(event.target.value)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    setDeletingAccount(true)
    setDeleteError(null)

    const { error } = await deleteAccount()

    if (error) {
      setDeletingAccount(false)
      setDeleteError(error.message)
      return
    }

    await signOut()
    navigate('/finora/login')
  }, [deleteAccount, signOut, navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <h1 className={s.title}>{t('settings:title')}</h1>
        <p className={s.subtitle}>{t('settings:subtitle')}</p>
      </div>

      <div className={s.blocks}>
        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('settings:profile.title')}</h2>

          <div className={s.profileRow}>
            <Avatar
              userId={user?.id ?? ''}
              avatarUrl={profile?.avatarUrl}
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              email={user?.email}
              size="lg"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className={s.hiddenFileInput}
              data-testid="settings-avatar-file-input"
            />
            <Button
              id="settings-change-photo-button"
              data-testid="settings-change-photo-button"
              variant="secondary"
              onClick={handleChangePhotoClick}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? t('settings:profile.uploading') : t('settings:profile.changePhoto')}
            </Button>
          </div>
          {avatarError && (
            <p role="alert" className={s.error}>
              {avatarError}
            </p>
          )}

          <label className={s.field}>
            {t('common:profileFields.email')}
            <input
              type="email"
              value={user?.email ?? ''}
              readOnly
              disabled
              className={s.input}
              data-testid="settings-email-input"
            />
          </label>

          <form onSubmit={handleSaveProfile} className={s.form}>
            <div className={s.fieldRow}>
              <label className={s.field}>
                {t('common:profileFields.firstName')}
                <input
                  type="text"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  className={s.input}
                  data-testid="settings-first-name-input"
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
                  value={lastName}
                  onChange={handleLastNameChange}
                  className={s.input}
                  data-testid="settings-last-name-input"
                />
                {lastNameError && (
                  <span role="alert" className={s.error}>
                    {lastNameError}
                  </span>
                )}
              </label>
            </div>

            <div className={s.fieldRow}>
              <label className={s.field}>
                {t('common:profileFields.phone')}
                <PhoneInput
                  value={phone}
                  onChange={handlePhoneChange}
                  countryCode={nationality ? COUNTRY_CALLING_CODES[nationality] : undefined}
                  testId="settings-phone-input"
                />
              </label>
              <label className={s.field}>
                {t('common:profileFields.nationality')}
                <select
                  value={nationality}
                  onChange={handleNationalityChange}
                  className={s.select}
                  data-testid="settings-nationality-select"
                >
                  <option value="">{t('common:profileFields.selectCountry')}</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={s.field}>
              {t('common:profileFields.dateOfBirth')}
              <input
                type="date"
                value={dateOfBirth}
                onChange={handleDateOfBirthChange}
                className={s.input}
                data-testid="settings-date-of-birth-input"
              />
            </label>

            {profileError && (
              <p role="alert" className={s.error}>
                {profileError}
              </p>
            )}
            {profileSuccess && <p className={s.success}>{t('settings:profile.saveSuccess')}</p>}
            <Button
              id="settings-save-profile-button"
              data-testid="settings-save-profile-button"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? t('common:buttons.saving') : t('common:buttons.saveChanges')}
            </Button>
          </form>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('settings:preferences.title')}</h2>
          {PREFERENCE_ITEMS.map((item) => (
            <div key={item.key} className={s.row}>
              <div>
                <p className={s.rowLabel}>{t(`settings:${item.labelKey}`)}</p>
                <p className={s.rowSub}>{t(`settings:${item.descriptionKey}`)}</p>
              </div>
              {/* Visual only - there's no preferences table in the schema yet. */}
              <button
                type="button"
                role="switch"
                aria-checked={item.defaultOn}
                disabled
                className={cn(s.switch, item.defaultOn && s.switchOn)}
                data-testid={`settings-preference-${item.key}-toggle`}
              />
            </div>
          ))}
          <div className={s.row}>
            <div>
              <p className={s.rowLabel}>{t('settings:preferences.darkMode.label')}</p>
              <p className={s.rowSub}>{t('settings:preferences.darkMode.description')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              onClick={handleThemeToggle}
              className={cn(s.switch, theme === 'dark' && s.switchOn)}
              data-testid="settings-preference-dark-mode-toggle"
            />
          </div>
          <div className={s.row}>
            <div>
              <p className={s.rowLabel}>{t('settings:preferences.language.label')}</p>
              <p className={s.rowSub}>{t('settings:preferences.language.description')}</p>
            </div>
            <div className={s.languageToggle} role="group" aria-label={t('settings:preferences.language.label')}>
              {LANGUAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-language={option.value}
                  aria-pressed={language === option.value}
                  onClick={handleLanguageButtonClick}
                  className={cn(s.languageButton, language === option.value && s.languageButtonActive)}
                  data-testid={`settings-preference-language-${option.value}-button`}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>{t('settings:security.title')}</h2>
          <form onSubmit={handleChangePassword} className={s.form}>
            <PasswordInput
              label={t('settings:security.currentPassword')}
              value={currentPassword}
              onChange={handleCurrentPasswordChange}
              testId="settings-current-password-input"
              required
            />
            <PasswordInput
              label={t('settings:security.newPassword')}
              value={newPassword}
              onChange={handleNewPasswordChange}
              testId="settings-new-password-input"
              required
            />
            <PasswordInput
              label={t('settings:security.confirmNewPassword')}
              value={confirmNewPassword}
              onChange={handleConfirmNewPasswordChange}
              testId="settings-confirm-password-input"
              required
            />
            {passwordError && (
              <p role="alert" className={s.error}>
                {passwordError}
              </p>
            )}
            {passwordSuccess && <p className={s.success}>{t('settings:security.saveSuccess')}</p>}
            <Button
              id="settings-change-password-button"
              data-testid="settings-change-password-button"
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword ? t('common:buttons.updating') : t('settings:security.changePassword')}
            </Button>
          </form>
        </div>

        <div className={cn(s.block, s.dangerBlock)}>
          <h2 className={s.blockTitle}>{t('settings:dangerZone.title')}</h2>
          <div className={s.row}>
            <div>
              <p className={s.rowLabel}>{t('settings:dangerZone.deleteAccount')}</p>
              <p className={s.rowSub}>{t('settings:dangerZone.deleteAccountDescription')}</p>
            </div>
            <Button
              id="settings-delete-account-button"
              data-testid="settings-delete-account-button"
              variant="secondary"
              className={s.dangerButton}
              onClick={handleOpenDeleteModal}
            >
              {t('settings:dangerZone.delete')}
            </Button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className={s.modalOverlay} onKeyDown={handleDeleteModalKeyDown}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
            <h3 id="delete-account-modal-title" className={s.modalTitle}>
              {t('settings:dangerZone.modalTitle')}
            </h3>
            <p className={s.modalText}>
              {t('settings:dangerZone.modalTextBefore')}{' '}
              <strong>{DELETE_CONFIRMATION_KEYWORD}</strong> {t('settings:dangerZone.modalTextAfter')}
            </p>
            <input
              ref={deleteInputRef}
              type="text"
              value={deleteConfirmationText}
              onChange={handleDeleteConfirmationChange}
              className={s.input}
              data-testid="settings-delete-confirmation-input"
            />
            {deleteError && (
              <p role="alert" className={s.error}>
                {deleteError}
              </p>
            )}
            <div className={s.modalActions}>
              <Button
                id="settings-delete-cancel-button"
                data-testid="settings-delete-cancel-button"
                variant="secondary"
                onClick={handleCloseDeleteModal}
                disabled={deletingAccount}
              >
                {t('common:buttons.cancel')}
              </Button>
              <Button
                id="settings-delete-confirm-button"
                data-testid="settings-delete-confirm-button"
                className={s.dangerButton}
                onClick={handleConfirmDelete}
                disabled={!canConfirmDelete || deletingAccount}
              >
                {deletingAccount ? t('common:buttons.deleting') : t('settings:dangerZone.deleteMyAccount')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
