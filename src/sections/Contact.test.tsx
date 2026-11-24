import { render, screen } from '@testing-library/react'
import { afterAll, describe, expect, it, vi } from 'vitest'

// Same reasoning as Hero.test.tsx: needs the real translated text inside the
// <em> highlight, which the global react-i18next mock can't produce (its
// Trans stub renders only `children`, and this component passes none).
vi.unmock('react-i18next')

const { I18nextProvider } = await import('react-i18next')
const { portfolioI18n } = await import('../i18n')
const { Contact } = await import('./Contact')

function renderContact(language: 'es' | 'en') {
  portfolioI18n.changeLanguage(language)
  return render(
    <I18nextProvider i18n={portfolioI18n}>
      <Contact />
    </I18nextProvider>
  )
}

describe('Contact', () => {
  afterAll(() => {
    portfolioI18n.changeLanguage('es')
  })

  it('highlights "reaccione" in the Spanish heading', () => {
    renderContact('es')

    expect(screen.getByText('reaccione', { selector: 'em' })).toBeInTheDocument()
  })

  it('highlights "reacts" in the English heading', () => {
    renderContact('en')

    expect(screen.getByText('reacts', { selector: 'em' })).toBeInTheDocument()
  })

  it('links to email, LinkedIn, and GitHub, with no phone link', () => {
    renderContact('es')

    expect(screen.getByTestId('contact-email-link')).toHaveAttribute('href', 'mailto:skarlet15m@gmail.com')
    expect(screen.getByTestId('contact-linkedin-link')).toHaveAttribute('href', 'https://linkedin.com/in/skarlet-araque')
    expect(screen.getByTestId('contact-github-link')).toHaveAttribute('href', 'https://github.com/SkarletA')
    expect(screen.queryByTestId('contact-phone-link')).not.toBeInTheDocument()
  })
})
