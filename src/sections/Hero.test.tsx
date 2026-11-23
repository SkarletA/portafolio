import { render, screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'

// This test needs the real translated/interpolated text (which word gets
// wrapped in <em> in each language), so it opts out of the global
// react-i18next mock from vitest.setup.js (that mock makes Trans render its
// children as-is, with no i18nKey/components applied at all).
vi.unmock('react-i18next')

const { I18nextProvider } = await import('react-i18next')
const { portfolioI18n } = await import('../i18n')
const { Hero } = await import('./Hero')

function renderHero(language: 'es' | 'en') {
  portfolioI18n.changeLanguage(language)
  return render(
    <I18nextProvider i18n={portfolioI18n}>
      <Hero />
    </I18nextProvider>
  )
}

describe('Hero', () => {
  afterAll(() => {
    portfolioI18n.changeLanguage('es')
  })

  it('highlights "química" and "código" in the Spanish tagline', () => {
    renderHero('es')

    expect(screen.getByText('química', { selector: 'em' })).toBeInTheDocument()
    expect(screen.getByText('código', { selector: 'em' })).toBeInTheDocument()
  })

  it('highlights "chemistry" and "code" in the English tagline', () => {
    renderHero('en')

    expect(screen.getByText('chemistry', { selector: 'em' })).toBeInTheDocument()
    expect(screen.getByText('code', { selector: 'em' })).toBeInTheDocument()
  })

  it('translates the CTAs', () => {
    renderHero('en')

    expect(screen.getByTestId('hero-view-projects-link')).toHaveTextContent('View projects')
    expect(screen.getByTestId('hero-talk-link')).toHaveTextContent("Let's talk")
  })
})
