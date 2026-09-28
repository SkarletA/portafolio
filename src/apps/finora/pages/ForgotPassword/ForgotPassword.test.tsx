import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ForgotPassword } from './ForgotPassword'
import { useAuth } from '@context/AuthContext'

vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/forgot-password']}>
      <ForgotPassword />
    </MemoryRouter>
  )
}

function submit(email: string) {
  fireEvent.change(screen.getByTestId('forgot-password-email-input'), { target: { value: email } })
  fireEvent.click(screen.getByTestId('forgot-password-submit-button'))
}

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('shows a confirmation screen with the submitted email once the reset request succeeds', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ requestPasswordReset } as never)
    renderPage()

    submit('ada@example.com')

    await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('ada@example.com'))
    expect(
      await screen.findByText('auth:forgotPassword.resetEmailSentTo:{"email":"ada@example.com"}')
    ).toBeInTheDocument()
    expect(screen.queryByTestId('forgot-password-submit-button')).not.toBeInTheDocument()
  })

  it('shows the error and keeps the form when the reset request fails', async () => {
    const requestPasswordReset = vi.fn().mockResolvedValue({ error: { message: 'No user found' } })
    vi.mocked(useAuth).mockReturnValue({ requestPasswordReset } as never)
    renderPage()

    submit('missing@example.com')

    expect(await screen.findByText('No user found')).toBeInTheDocument()
    expect(screen.getByTestId('forgot-password-submit-button')).toBeInTheDocument()
  })

  it('disables the submit button while the request is in flight', async () => {
    let resolveReset!: (value: { error: null }) => void
    const requestPasswordReset = vi.fn(() => new Promise((resolve) => { resolveReset = resolve }))
    vi.mocked(useAuth).mockReturnValue({ requestPasswordReset } as never)
    renderPage()

    submit('ada@example.com')

    expect(screen.getByTestId('forgot-password-submit-button')).toBeDisabled()
    expect(screen.getByTestId('forgot-password-submit-button')).toHaveTextContent('auth:forgotPassword.submitting')

    resolveReset({ error: null })
    await screen.findByText('auth:shared.checkYourEmailTitle')
  })
})
