import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import cn from 'clsx'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { updateProfile, uploadAvatar } from '../services/profilesService'
import { Avatar } from '../components/atoms/Avatar/Avatar'
import { Button } from '../components/atoms/Button/Button'
import { PasswordInput } from '../components/molecules/PasswordInput/PasswordInput'
import { PhoneInput } from '../components/molecules/PhoneInput/PhoneInput'
import { COUNTRIES, COUNTRY_CALLING_CODES, isValidName } from '../domain/profile'
import s from './Settings.module.css'

const DELETE_CONFIRMATION_KEYWORD = 'DELETE'
const MIN_PASSWORD_LENGTH = 6

const PREFERENCE_ITEMS = [
  {
    key: 'weekly-summary',
    label: 'Weekly summary email',
    description: 'Get a recap of income and spending every Monday',
    defaultOn: true,
  },
  {
    key: 'budget-alerts',
    label: 'Budget alerts',
    description: 'Notify me when a category is close to its limit',
    defaultOn: true,
  },
  {
    key: 'dark-mode',
    label: 'Dark mode',
    description: 'Switch the interface to a darker palette',
    defaultOn: false,
  },
]

export function Settings() {
  const { user, changePassword, deleteAccount, signOut } = useAuth()
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

  const handleFirstNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setFirstName(value)
    setFirstNameError(isValidName(value) ? null : "Name shouldn't contain numbers or symbols")
    setProfileSuccess(false)
  }, [])

  const handleLastNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setLastName(value)
    setLastNameError(isValidName(value) ? null : "Last name shouldn't contain numbers or symbols")
    setProfileSuccess(false)
  }, [])

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
        setProfileError('Fix the highlighted fields before saving')
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
    [firstName, lastName, phone, nationality, dateOfBirth, refetchProfile]
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
        setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
        return
      }

      if (newPassword !== confirmNewPassword) {
        setPasswordError("New passwords don't match")
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
    [currentPassword, newPassword, confirmNewPassword, changePassword]
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
        <h1 className={s.title}>Settings</h1>
        <p className={s.subtitle}>Manage your account and preferences</p>
      </div>

      <div className={s.blocks}>
        <div className={s.block}>
          <h2 className={s.blockTitle}>Profile</h2>

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
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </Button>
          </div>
          {avatarError && (
            <p role="alert" className={s.error}>
              {avatarError}
            </p>
          )}

          <label className={s.field}>
            Email
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
                First name
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
                Last name
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
                Phone
                <PhoneInput
                  value={phone}
                  onChange={handlePhoneChange}
                  countryCode={nationality ? COUNTRY_CALLING_CODES[nationality] : undefined}
                  testId="settings-phone-input"
                />
              </label>
              <label className={s.field}>
                Nationality
                <select
                  value={nationality}
                  onChange={handleNationalityChange}
                  className={s.select}
                  data-testid="settings-nationality-select"
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
              Date of birth
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
            {profileSuccess && <p className={s.success}>Your profile was updated.</p>}
            <Button
              id="settings-save-profile-button"
              data-testid="settings-save-profile-button"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>Preferences</h2>
          {PREFERENCE_ITEMS.map((item) => (
            <div key={item.key} className={s.row}>
              <div>
                <p className={s.rowLabel}>{item.label}</p>
                <p className={s.rowSub}>{item.description}</p>
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
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>Security</h2>
          <form onSubmit={handleChangePassword} className={s.form}>
            <PasswordInput
              label="Current password"
              value={currentPassword}
              onChange={handleCurrentPasswordChange}
              testId="settings-current-password-input"
              required
            />
            <PasswordInput
              label="New password"
              value={newPassword}
              onChange={handleNewPasswordChange}
              testId="settings-new-password-input"
              required
            />
            <PasswordInput
              label="Confirm new password"
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
            {passwordSuccess && <p className={s.success}>Your password was updated.</p>}
            <Button
              id="settings-change-password-button"
              data-testid="settings-change-password-button"
              type="submit"
              disabled={changingPassword}
            >
              {changingPassword ? 'Updating…' : 'Change password'}
            </Button>
          </form>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>Linked accounts</h2>
          <p className={s.stateMessage}>Not available yet.</p>
        </div>

        <div className={s.block}>
          <h2 className={s.blockTitle}>Billing</h2>
          <p className={s.stateMessage}>Not available yet.</p>
        </div>

        <div className={cn(s.block, s.dangerBlock)}>
          <h2 className={s.blockTitle}>Danger zone</h2>
          <div className={s.row}>
            <div>
              <p className={s.rowLabel}>Delete account</p>
              <p className={s.rowSub}>Permanently remove your Finora account and data</p>
            </div>
            <Button
              id="settings-delete-account-button"
              data-testid="settings-delete-account-button"
              variant="secondary"
              className={s.dangerButton}
              onClick={handleOpenDeleteModal}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className={s.modalOverlay} onKeyDown={handleDeleteModalKeyDown}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="delete-account-modal-title">
            <h3 id="delete-account-modal-title" className={s.modalTitle}>
              Delete your account?
            </h3>
            <p className={s.modalText}>
              This permanently deletes your account and all of your data. This can&apos;t be undone. Type{' '}
              <strong>{DELETE_CONFIRMATION_KEYWORD}</strong> or your email address to confirm.
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
                Cancel
              </Button>
              <Button
                id="settings-delete-confirm-button"
                data-testid="settings-delete-confirm-button"
                className={s.dangerButton}
                onClick={handleConfirmDelete}
                disabled={!canConfirmDelete || deletingAccount}
              >
                {deletingAccount ? 'Deleting…' : 'Delete my account'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
