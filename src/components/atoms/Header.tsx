import { Menu } from '@portfolio-components/molecules/Menu'
import s from './Header.module.css'

const links = [
  { href: '#about', label: 'About' },
  { href: '#experience', label: 'Experience' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#education', label: 'Education' },
  { href: '#contact', label: 'Contact' },
]

export function Header() {
  return (
    <header className={s.header}>
      <a href="#main" className={s.skipLink} data-testid="header-skip-to-content-link">
        Skip to content
      </a>
      <div className={s.inner}>
        <a href="#top" className={s.brand} data-testid="header-brand-link">
          Portfolio
        </a>
        <Menu links={links} />
      </div>
    </header>
  )
}
