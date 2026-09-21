import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

const signOut = vi.fn()
const setLanguage = vi.fn()
const setCurrency = vi.fn()

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'skarlet@example.com' }, signOut }),
}))

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { firstName: 'Skarlet', lastName: 'Araque', avatarUrl: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', setLanguage }),
}))

vi.mock('../../../context/CurrencyContext', () => ({
  useCurrency: () => ({ currency: 'USD', setCurrency }),
}))

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('includes Settings as the last item of the main nav group', () => {
    renderSidebar()

    const settingsLink = screen.getByRole('link', { name: 'nav.settings' })
    expect(settingsLink).toHaveAttribute('href', '/finora/settings')
  })

  it('navigates to Settings when clicking the profile block (avatar + name)', () => {
    renderSidebar()

    const profileLink = screen.getByTestId('sidebar-profile-settings-link')
    expect(profileLink).toHaveAttribute('href', '/finora/settings')
    expect(profileLink).toHaveTextContent('Skarlet Araque')
  })

  it('keeps sign out as an independent action outside the profile link', () => {
    renderSidebar()

    const signOutButton = screen.getByTestId('sidebar-sign-out-button')
    expect(signOutButton.closest('a')).toBeNull()

    fireEvent.click(signOutButton)
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('shows the current language and currency in the preference dropdowns', () => {
    renderSidebar()

    expect(screen.getByTestId('sidebar-language-toggle')).toHaveTextContent('settings:preferences.language.en')
    expect(screen.getByTestId('sidebar-currency-toggle')).toHaveTextContent('settings:preferences.currency.usd')
  })

  it('still renders the (de-emphasized) back-to-portfolio link', () => {
    renderSidebar()

    const backLink = screen.getByTestId('sidebar-back-to-portfolio-link')
    expect(backLink).toHaveAttribute('href', '/')
  })
})
