import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Settings } from './Settings'
import { useAuth } from '@context/AuthContext'
import { useTheme } from '@context/ThemeContext'
import { useLanguage } from '@context/LanguageContext'
import { useCurrency } from '@context/CurrencyContext'
import { useProfile } from '@hooks/useProfile'
import { updateProfile } from '@services/profilesService'

vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('@context/ThemeContext', () => ({ useTheme: vi.fn() }))
vi.mock('@context/LanguageContext', () => ({ useLanguage: vi.fn() }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: vi.fn() }))
vi.mock('@hooks/useProfile', () => ({ useProfile: vi.fn() }))
vi.mock('@services/profilesService', () => ({
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}))

const profile = {
  userId: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: null,
  nationality: null,
  dateOfBirth: '1990-01-01',
  avatarUrl: null,
  theme: 'light' as const,
  language: 'en' as const,
  currency: 'USD' as const,
}

function mockHooks(overrides: {
  auth?: Record<string, unknown>
  theme?: Record<string, unknown>
  language?: Record<string, unknown>
  currency?: Record<string, unknown>
  profile?: Record<string, unknown> | null
} = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u1', email: 'ada@example.com' },
    changePassword: vi.fn().mockResolvedValue({ error: null }),
    deleteAccount: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    ...overrides.auth,
  } as never)
  vi.mocked(useTheme).mockReturnValue({ theme: 'light', setTheme: vi.fn(), ...overrides.theme } as never)
  vi.mocked(useLanguage).mockReturnValue({ language: 'en', setLanguage: vi.fn(), ...overrides.language } as never)
  vi.mocked(useCurrency).mockReturnValue({ currency: 'USD', setCurrency: vi.fn(), ...overrides.currency } as never)
  vi.mocked(useProfile).mockReturnValue({
    profile: overrides.profile === null ? null : { ...profile, ...overrides.profile },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as never)
}

function renderSettings() {
  render(
    <MemoryRouter initialEntries={['/finora/settings']}>
      <Routes>
        <Route path="/finora/settings" element={<Settings />} />
        <Route path="/finora/login" element={<p>login page</p>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Settings', () => {
  beforeEach(() => {
    vi.mocked(updateProfile).mockReset()
  })

  it('renders the profile form pre-filled from useProfile', () => {
    mockHooks()
    renderSettings()

    expect(screen.getByTestId('settings-email-input')).toHaveValue('ada@example.com')
    expect(screen.getByTestId('settings-first-name-input')).toHaveValue('Ada')
    expect(screen.getByTestId('settings-last-name-input')).toHaveValue('Lovelace')
    expect(screen.getByTestId('settings-date-of-birth-input')).toHaveValue('1990-01-01')
  })

  it('saves profile changes and shows a success message', async () => {
    mockHooks()
    vi.mocked(updateProfile).mockResolvedValue({ error: null } as never)
    renderSettings()

    fireEvent.change(screen.getByTestId('settings-first-name-input'), { target: { value: 'Grace' } })
    fireEvent.click(screen.getByTestId('settings-save-profile-button'))

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith({
        firstName: 'Grace',
        lastName: 'Lovelace',
        phone: '',
        nationality: '',
        dateOfBirth: '1990-01-01',
      })
    )
    expect(await screen.findByText('settings:profile.saveSuccess')).toBeInTheDocument()
  })

  it('shows the database message when saving the profile fails', async () => {
    mockHooks()
    vi.mocked(updateProfile).mockResolvedValue({ error: { message: 'boom' } } as never)
    renderSettings()

    fireEvent.click(screen.getByTestId('settings-save-profile-button'))

    expect(await screen.findByText('boom')).toBeInTheDocument()
    expect(screen.queryByText('settings:profile.saveSuccess')).not.toBeInTheDocument()
  })

  it('toggles dark mode through the theme context', () => {
    const setTheme = vi.fn()
    mockHooks({ theme: { theme: 'light', setTheme } })
    renderSettings()

    fireEvent.click(screen.getByTestId('settings-preference-dark-mode-toggle'))

    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('switches language through the language context', () => {
    const setLanguage = vi.fn()
    mockHooks({ language: { language: 'en', setLanguage } })
    renderSettings()

    fireEvent.click(screen.getByTestId('settings-preference-language-es-button'))

    expect(setLanguage).toHaveBeenCalledWith('es')
  })

  it('switches currency through the currency context', () => {
    const setCurrency = vi.fn()
    mockHooks({ currency: { currency: 'USD', setCurrency } })
    renderSettings()

    fireEvent.click(screen.getByTestId('settings-preference-currency-eur-button'))

    expect(setCurrency).toHaveBeenCalledWith('EUR')
  })

  describe('password change', () => {
    it('rejects a new password shorter than the minimum length', async () => {
      const changePassword = vi.fn()
      mockHooks({ auth: { changePassword } })
      renderSettings()

      fireEvent.change(screen.getByTestId('settings-current-password-input'), { target: { value: 'oldpass' } })
      fireEvent.change(screen.getByTestId('settings-new-password-input'), { target: { value: 'short' } })
      fireEvent.change(screen.getByTestId('settings-confirm-password-input'), { target: { value: 'short' } })
      fireEvent.click(screen.getByTestId('settings-change-password-button'))

      expect(await screen.findByText('common:validation.passwordMinLength:{"count":6}')).toBeInTheDocument()
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('rejects a confirmation that does not match the new password', async () => {
      const changePassword = vi.fn()
      mockHooks({ auth: { changePassword } })
      renderSettings()

      fireEvent.change(screen.getByTestId('settings-current-password-input'), { target: { value: 'oldpass' } })
      fireEvent.change(screen.getByTestId('settings-new-password-input'), { target: { value: 'longenough' } })
      fireEvent.change(screen.getByTestId('settings-confirm-password-input'), { target: { value: 'different' } })
      fireEvent.click(screen.getByTestId('settings-change-password-button'))

      expect(await screen.findByText('common:validation.passwordsDontMatch')).toBeInTheDocument()
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('changes the password and clears the fields on success', async () => {
      const changePassword = vi.fn().mockResolvedValue({ error: null })
      mockHooks({ auth: { changePassword } })
      renderSettings()

      fireEvent.change(screen.getByTestId('settings-current-password-input'), { target: { value: 'oldpass' } })
      fireEvent.change(screen.getByTestId('settings-new-password-input'), { target: { value: 'newpassword' } })
      fireEvent.change(screen.getByTestId('settings-confirm-password-input'), { target: { value: 'newpassword' } })
      fireEvent.click(screen.getByTestId('settings-change-password-button'))

      await waitFor(() => expect(changePassword).toHaveBeenCalledWith('oldpass', 'newpassword'))
      expect(await screen.findByText('settings:security.saveSuccess')).toBeInTheDocument()
      expect(screen.getByTestId('settings-new-password-input')).toHaveValue('')
    })
  })

  describe('delete account', () => {
    it('only enables the confirm button once the exact keyword is typed, then deletes and signs out', async () => {
      const deleteAccount = vi.fn().mockResolvedValue({ error: null })
      const signOut = vi.fn().mockResolvedValue({ error: null })
      mockHooks({ auth: { deleteAccount, signOut } })
      renderSettings()

      fireEvent.click(screen.getByTestId('settings-delete-account-button'))
      expect(screen.getByTestId('settings-delete-confirm-button')).toBeDisabled()

      fireEvent.change(screen.getByTestId('settings-delete-confirmation-input'), { target: { value: 'delete' } })
      expect(screen.getByTestId('settings-delete-confirm-button')).toBeDisabled()

      fireEvent.change(screen.getByTestId('settings-delete-confirmation-input'), { target: { value: 'DELETE' } })
      expect(screen.getByTestId('settings-delete-confirm-button')).toBeEnabled()

      fireEvent.click(screen.getByTestId('settings-delete-confirm-button'))

      await waitFor(() => expect(deleteAccount).toHaveBeenCalled())
      expect(signOut).toHaveBeenCalled()
      expect(await screen.findByText('login page')).toBeInTheDocument()
    })
  })
})
