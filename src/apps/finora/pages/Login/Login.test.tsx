import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from './Login'
import { useAuth } from '@context/AuthContext'

vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/login']}>
      <Routes>
        <Route path="/finora/login" element={<Login />} />
        <Route path="/finora" element={<p>dashboard</p>} />
      </Routes>
    </MemoryRouter>
  )
}

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByTestId('login-email-input'), { target: { value: email } })
  fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: password } })
}

describe('Login', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('signs in and navigates to the dashboard on success', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
    renderPage()

    fillForm('ada@example.com', 'secret123')
    fireEvent.click(screen.getByTestId('login-submit-button'))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('ada@example.com', 'secret123'))
    expect(await screen.findByText('dashboard')).toBeInTheDocument()
  })

  it('disables the submit button and shows the submitting label while signing in', async () => {
    let resolveSignIn!: (value: { error: null }) => void
    const signIn = vi.fn(() => new Promise((resolve) => { resolveSignIn = resolve }))
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
    renderPage()

    fillForm('ada@example.com', 'secret123')
    fireEvent.click(screen.getByTestId('login-submit-button'))

    expect(screen.getByTestId('login-submit-button')).toBeDisabled()
    expect(screen.getByTestId('login-submit-button')).toHaveTextContent('auth:login.submitting')

    resolveSignIn({ error: null })
    await waitFor(() => expect(screen.getByTestId('login-submit-button')).not.toBeDisabled())
  })

  it('shows a friendly message for an unconfirmed email instead of the raw error', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Email not confirmed' } })
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
    renderPage()

    fillForm('ada@example.com', 'secret123')
    fireEvent.click(screen.getByTestId('login-submit-button'))

    expect(await screen.findByText('auth:login.emailNotConfirmed')).toBeInTheDocument()
  })

  it('shows the raw error message for any other sign-in failure', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
    renderPage()

    fillForm('ada@example.com', 'wrong-password')
    fireEvent.click(screen.getByTestId('login-submit-button'))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
  })

  it('offers to resend the confirmation email only when the email is not confirmed', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    vi.mocked(useAuth).mockReturnValue({ signIn } as never)
    renderPage()

    fillForm('ada@example.com', 'wrong-password')
    fireEvent.click(screen.getByTestId('login-submit-button'))

    await screen.findByText('Invalid login credentials')
    expect(screen.queryByTestId('login-resend-confirmation-button')).not.toBeInTheDocument()
  })

  it('resends the confirmation email to the typed address and reports it', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const resendConfirmation = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ signIn, resendConfirmation } as never)
    renderPage()

    fillForm('ada@example.com', 'secret123')
    fireEvent.click(screen.getByTestId('login-submit-button'))
    fireEvent.click(await screen.findByTestId('login-resend-confirmation-button'))

    await waitFor(() => expect(resendConfirmation).toHaveBeenCalledWith('ada@example.com'))
    expect(await screen.findByTestId('login-resend-confirmation-message')).toHaveTextContent(
      'auth:login.confirmationResent'
    )
  })

  it('shows the error returned when the resend fails', async () => {
    const signIn = vi.fn().mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const resendConfirmation = vi.fn().mockResolvedValue({ error: { message: 'For security purposes, wait before retrying' } })
    vi.mocked(useAuth).mockReturnValue({ signIn, resendConfirmation } as never)
    renderPage()

    fillForm('ada@example.com', 'secret123')
    fireEvent.click(screen.getByTestId('login-submit-button'))
    fireEvent.click(await screen.findByTestId('login-resend-confirmation-button'))

    expect(await screen.findByText('For security purposes, wait before retrying')).toBeInTheDocument()
  })
})
