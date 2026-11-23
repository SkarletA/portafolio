import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from '@portfolio-components/molecules/Menu'
import s from './Header.module.css'

export function Header() {
  const { t, i18n } = useTranslation()

  const links = [
    { href: '#lab', label: t('header.nav.lab') },
    { href: '#laboratoria', label: t('header.nav.laboratoria') },
    { href: '#formacion-continua', label: t('header.nav.learning') },
    { href: '#proyectos', label: t('header.nav.projects') },
    { href: '#tabla', label: t('header.nav.stack') },
    { href: '#contacto', label: t('header.nav.contact') },
  ]

  const isSpanish = i18n.language?.startsWith('es')

  const handleLanguageToggleClick = useCallback(() => {
    i18n.changeLanguage(isSpanish ? 'en' : 'es')
  }, [i18n, isSpanish])

  return (
    <header className={s.header}>
      <a href="#main" className={s.skipLink} data-testid="header-skip-to-content-link">
        {t('header.skipToContent')}
      </a>
      <div className={s.inner}>
        <a href="#top" className={s.brand} data-testid="header-brand-link">
          skarlet<span className={s.brandDot}>.</span>dev
        </a>
        <div className={s.actions}>
          <Menu links={links} />
          <button
            type="button"
            className={s.languageToggle}
            onClick={handleLanguageToggleClick}
            data-testid="header-language-toggle-button"
          >
            {isSpanish ? 'English' : 'Español'}
          </button>
        </div>
      </div>
    </header>
  )
}
