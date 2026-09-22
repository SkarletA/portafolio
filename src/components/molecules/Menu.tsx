import { useCallback, useState } from 'react'
import s from './Menu.module.css'

interface MenuLink {
  href: string
  label: string
}

interface MenuProps {
  links: MenuLink[]
}

export function Menu({ links }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggleClick = useCallback(() => {
    setIsOpen((open) => !open)
  }, [])

  const handleLinkClick = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <nav aria-label="Primary">
      {/* Desktop */}
      <ul className={s.desktopList}>
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={s.desktopLink}
              data-testid={`menu-desktop-${link.href.replace('#', '')}-link`}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Mobile button */}
      <button
        type="button"
        className={s.toggleButton}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={handleToggleClick}
        data-testid="menu-toggle-button"
      >
        <span className={s.toggleIcon}>{isOpen ? '×' : '☰'}</span>
      </button>

      {/* Mobile menu */}
      {isOpen && (
        <ul id="mobile-navigation" className={s.mobileList}>
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={s.mobileLink}
                onClick={handleLinkClick}
                data-testid={`menu-mobile-${link.href.replace('#', '')}-link`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
