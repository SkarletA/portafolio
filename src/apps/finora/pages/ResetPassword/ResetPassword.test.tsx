import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResetPassword } from './ResetPassword'
import { useAuth } from '@context/AuthContext'

vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/reset-password']}>
      <ResetPassword />
    </MemoryRouter>
  )
}

function fillPasswords(password: string, confirmPassword: string) {
  fireEvent.change(screen.getByTestId('reset-password-password-input'), { target: { value: password } })
  fireEvent.change(screen.getByTestId('reset-password-confirm-input'), { target: { value: confirmPassword } })
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('rejects a password that does not meet the strength requirements, without calling updatePassword', () => {
    const updatePassword = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ updatePassword } as never)
    renderPage()

    fillPasswords('weak', 'weak')
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    expect(screen.getByText('auth:shared.passwordRequirementsNotMet')).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords, without calling updatePassword', () => {
    const updatePassword = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ updatePassword } as never)
    renderPage()

    fillPasswords('Str0ng!Pass', 'Different1!')
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    expect(screen.getByText('common:validation.passwordsDontMatch')).toBeInTheDocument()
    expect(updatePassword).not.toHaveBeenCalled()
  })

  it('updates the password and shows the success screen with a link back to sign in', async () => {
    const updatePassword = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ updatePassword } as never)
    renderPage()

    fillPasswords('Str0ng!Pass', 'Str0ng!Pass')
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith('Str0ng!Pass'))
    expect(await screen.findByText('auth:resetPassword.successTitle')).toBeInTheDocument()
    expect(screen.getByTestId('reset-password-login-link')).toBeInTheDocument()
  })

  it('shows the error and keeps the form when updatePassword fails', async () => {
    const updatePassword = vi.fn().mockResolvedValue({ error: { message: 'Session expired' } })
    vi.mocked(useAuth).mockReturnValue({ updatePassword } as never)
    renderPage()

    fillPasswords('Str0ng!Pass', 'Str0ng!Pass')
    fireEvent.click(screen.getByTestId('reset-password-submit-button'))

    expect(await screen.findByText('Session expired')).toBeInTheDocument()
    expect(screen.getByTestId('reset-password-submit-button')).toBeInTheDocument()
  })
})
