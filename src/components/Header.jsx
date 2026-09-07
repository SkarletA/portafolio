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
    <header className="sticky top-0 z-50 border-b border-paper/10 bg-ink/80 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-sm focus:bg-ember focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl items-center justify-between px-6 py-4 md:flex">
        <a href="#top" className="font-display text-lg tracking-tight text-paper">
          Portfolio
        </a>
        <nav aria-label="Primary">
          <ul className="flex max-w-[60vw] gap-5 overflow-x-auto text-sm text-paper-muted md:max-w-none md:gap-7">
            {links.map((link) => (
              <li key={link.href} className="shrink-0">
                <a className="transition-colors hover:text-paper" href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
