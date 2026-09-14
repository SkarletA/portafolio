import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import cn from 'clsx'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/atoms/Button/Button'
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
  const { user, updateProfile, updateEmail, uploadAvatar, changePassword, deleteAccount, signOut } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [email, setEmail] = useState(user?.email ?? '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailPendingConfirmation, setEmailPendingConfirmation] = useState<string | null>(null)

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

  const initials = (user?.fullName || user?.email || '?')[0]?.toUpperCase() ?? '?'
  const canConfirmDelete =
    deleteConfirmationText.trim() === DELETE_CONFIRMATION_KEYWORD ||
    (!!user?.email && deleteConfirmationText.trim().toLowerCase() === user.email.toLowerCase())

  useEffect(() => {
    if (isDeleteModalOpen) deleteInputRef.current?.focus()
  }, [isDeleteModalOpen])

  const handleFullNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFullName(event.target.value)
    setProfileSuccess(false)
  }, [])

  const handleSaveProfile = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      setSavingProfile(true)
      setProfileError(null)
      setProfileSuccess(false)

      const { error } = await updateProfile({ fullName: fullName.trim() })

      setSavingProfile(false)

      if (error) {
        setProfileError(error.message)
        return
      }

      setProfileSuccess(true)
    },
    [fullName, updateProfile]
  )

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value)
    setEmailPendingConfirmation(null)
  }, [])

  const handleSaveEmail = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const trimmedEmail = email.trim()
      if (!trimmedEmail || trimmedEmail === user?.email) return

      setSavingEmail(true)
      setEmailError(null)
      setEmailPendingConfirmation(null)

      const { error } = await updateEmail(trimmedEmail)

      setSavingEmail(false)

      if (error) {
        setEmailError(error.message)
        return
      }

      setEmailPendingConfirmation(trimmedEmail)
    },
    [email, user?.email, updateEmail]
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
      }
    },
    [uploadAvatar]
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
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className={s.avatarImage} />
            ) : (
              <div className={s.avatarFallback}>{initials}</div>
            )}
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

          <form onSubmit={handleSaveProfile} className={s.form}>
            <label className={s.field}>
              Full name
              <input
                type="text"
                value={fullName}
                onChange={handleFullNameChange}
                className={s.input}
                data-testid="settings-full-name-input"
              />
            </label>
            {profileError && (
              <p role="alert" className={s.error}>
                {profileError}
              </p>
            )}
            {profileSuccess && <p className={s.success}>Your name was updated.</p>}
            <Button
              id="settings-save-profile-button"
              data-testid="settings-save-profile-button"
              type="submit"
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </form>

          <form onSubmit={handleSaveEmail} className={s.form}>
            <label className={s.field}>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                className={s.input}
                data-testid="settings-email-input"
              />
            </label>
            {emailError && (
              <p role="alert" className={s.error}>
                {emailError}
              </p>
            )}
            {emailPendingConfirmation && (
              <p className={s.success}>
                We sent a confirmation email to {emailPendingConfirmation}. The change will apply once you confirm
                it.
              </p>
            )}
            <Button
              id="settings-save-email-button"
              data-testid="settings-save-email-button"
              type="submit"
              disabled={savingEmail || !email.trim() || email.trim() === user?.email}
            >
              {savingEmail ? 'Sending…' : 'Save changes'}
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
            <label className={s.field}>
              Current password
              <input
                type="password"
                required
                value={currentPassword}
                onChange={handleCurrentPasswordChange}
                className={s.input}
                data-testid="settings-current-password-input"
              />
            </label>
            <label className={s.field}>
              New password
              <input
                type="password"
                required
                value={newPassword}
                onChange={handleNewPasswordChange}
                className={s.input}
                data-testid="settings-new-password-input"
              />
            </label>
            <label className={s.field}>
              Confirm new password
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={handleConfirmNewPasswordChange}
                className={s.input}
                data-testid="settings-confirm-password-input"
              />
            </label>
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
