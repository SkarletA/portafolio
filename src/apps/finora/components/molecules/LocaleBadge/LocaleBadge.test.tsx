import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LocaleBadge } from './LocaleBadge'

vi.mock('../../../context/CurrencyContext', () => ({ useCurrency: () => ({ currency: 'EUR', setCurrency: vi.fn() }) }))
vi.mock('../../../context/LanguageContext', () => ({ useLanguage: () => ({ language: 'es', setLanguage: vi.fn() }) }))

describe('LocaleBadge', () => {
  it('shows the current language and currency and links to settings', () => {
    render(
      <MemoryRouter>
        <LocaleBadge />
      </MemoryRouter>
    )

    const link = screen.getByTestId('locale-badge-settings-link')
    expect(link).toHaveTextContent('ES · EUR')
    expect(link).toHaveAttribute('href', '/finora/settings')
  })
})
