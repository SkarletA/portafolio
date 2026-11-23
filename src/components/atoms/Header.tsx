import { Menu } from '@portfolio-components/molecules/Menu'
import s from './Header.module.css'

const links = [
  { href: '#lab', label: 'Laboratorio' },
  { href: '#laboratoria', label: 'Formación' },
  { href: '#formacion-continua', label: 'Aprendizaje' },
  { href: '#proyectos', label: 'Proyectos' },
  { href: '#tabla', label: 'Stack' },
  { href: '#contacto', label: 'Contacto' },
]

export function Header() {
  return (
    <header className={s.header}>
      <a href="#main" className={s.skipLink} data-testid="header-skip-to-content-link">
        Saltar al contenido
      </a>
      <div className={s.inner}>
        <a href="#top" className={s.brand} data-testid="header-brand-link">
          skarlet<span className={s.brandDot}>.</span>dev
        </a>
        <Menu links={links} />
      </div>
    </header>
  )
}
