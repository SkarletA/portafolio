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
})
