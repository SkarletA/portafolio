import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('@context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'skarlet@example.com' }, signOut: vi.fn() }),
}))
vi.mock('@hooks/useProfile', () => ({
  useProfile: () => ({ profile: { firstName: 'Skarlet', lastName: 'Araque', avatarUrl: null }, loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('@context/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', setLanguage: vi.fn() }) }))
vi.mock('@context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'USD', setCurrency: vi.fn() }) }))
vi.mock('@context/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }))
vi.mock('@context/HouseholdContext', () => ({ useHousehold: vi.fn() }))

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useHousehold).mockReturnValue({
      ownMember: null,
      partner: null,
      partnerMember: null,
      actionPending: false,
      actionError: null,
      accept: vi.fn(),
      decline: vi.fn(),
    } as never)
  })

  it("renders the mobile bottom nav's five destination tabs, the add button, and the More tab", () => {
    renderShell()
    const bottomNav = within(screen.getByTestId('mobile-bottom-nav'))

    expect(bottomNav.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(bottomNav.getByRole('link', { name: /transactions/i })).toBeInTheDocument()
    expect(bottomNav.getByRole('link', { name: /budgets/i })).toBeInTheDocument()
    expect(bottomNav.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
    expect(bottomNav.getByTestId('mobile-more-button')).toBeInTheDocument()
    expect(bottomNav.getByTestId('mobile-add-transaction-button')).toBeInTheDocument()
  })

  it('no longer lists Goals or Recurring as their own bottom-nav tab - they live under More now', () => {
    renderShell()
    const bottomNav = within(screen.getByTestId('mobile-bottom-nav'))

    expect(bottomNav.queryByRole('link', { name: /^goals$/i })).not.toBeInTheDocument()
    expect(bottomNav.queryByRole('link', { name: /^recurring$/i })).not.toBeInTheDocument()
  })

  it('renders the page content passed as children', () => {
    renderShell()

    expect(screen.getByText('Page content')).toBeInTheDocument()
  })
})
