import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Register } from './Register'
import { useAuth } from '@context/AuthContext'

vi.mock('@context/AuthContext', () => ({ useAuth: vi.fn() }))

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/finora/register']}>
      <Register />
    </MemoryRouter>
  )
}

function fillRequiredFields({ firstName = 'Ada', lastName = 'Lovelace', email = 'ada@example.com', password = 'Str0ng!Pass' } = {}) {
  fireEvent.change(screen.getByTestId('register-first-name-input'), { target: { value: firstName } })
  fireEvent.change(screen.getByTestId('register-last-name-input'), { target: { value: lastName } })
  fireEvent.change(screen.getByTestId('register-email-input'), { target: { value: email } })
  fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: password } })
}

describe('Register', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset()
  })

  it('flags a name with digits or symbols inline, as the field changes', () => {
    const signUp = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fireEvent.change(screen.getByTestId('register-first-name-input'), { target: { value: 'Ada123' } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'common:validation.invalidNameField:{"field":"common:profileFields.firstName"}'
    )
  })

  it('blocks submit when a name is invalid, without calling signUp', () => {
    const signUp = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fillRequiredFields({ firstName: 'Ada123' })
    fireEvent.click(screen.getByTestId('register-submit-button'))

    expect(screen.getByText('common:validation.fixHighlightedFields')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('blocks submit when the password does not meet the strength requirements, without calling signUp', () => {
    const signUp = vi.fn()
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fillRequiredFields({ password: 'weak' })
    fireEvent.click(screen.getByTestId('register-submit-button'))

    expect(screen.getByText('auth:shared.passwordRequirementsNotMet')).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('signs up with only the required metadata when every optional field is left empty', async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fillRequiredFields()
    fireEvent.click(screen.getByTestId('register-submit-button'))

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith('ada@example.com', 'Str0ng!Pass', {
        first_name: 'Ada',
        last_name: 'Lovelace',
      })
    )
  })

  it('shows the confirmation screen with the submitted email once sign-up succeeds', async () => {
    const signUp = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fillRequiredFields({ email: 'ada@example.com' })
    fireEvent.click(screen.getByTestId('register-submit-button'))

    expect(
      await screen.findByText('auth:register.confirmationSentTo:{"email":"ada@example.com"}')
    ).toBeInTheDocument()
  })

  it('shows the error and keeps the form when sign-up fails', async () => {
    const signUp = vi.fn().mockResolvedValue({ error: { message: 'Email already registered' } })
    vi.mocked(useAuth).mockReturnValue({ signUp } as never)
    renderPage()

    fillRequiredFields()
    fireEvent.click(screen.getByTestId('register-submit-button'))

    expect(await screen.findByText('Email already registered')).toBeInTheDocument()
    expect(screen.getByTestId('register-submit-button')).toBeInTheDocument()
  })
})
