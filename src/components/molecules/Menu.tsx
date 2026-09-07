import { useState } from "react";

export function Menu({ links }: { links: { href: string; label: string }[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav aria-label="Primary">
      {/* Desktop */}
      <ul className="hidden items-center gap-7 text-sm text-paper-muted md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="transition-colors hover:text-paper"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Mobile button */}
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-paper-muted md:hidden"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="text-2xl">
          {isOpen ? "×" : "☰"}
        </span>
      </button>

      {/* Mobile menu */}
      {isOpen && (
        <ul
          id="mobile-navigation"
          className="absolute left-0 right-0 top-full flex flex-col gap-4 border-t border-white/10 bg-black/95 px-6 py-5 md:hidden"
        >
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="block py-2 text-sm text-paper-muted transition-colors hover:text-paper"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

