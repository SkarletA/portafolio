import { Link } from 'react-router-dom'

export function AppShell({ children }) {
  return (
    <div className="min-h-svh bg-finora-bg text-finora-ink">
      <header className="border-b border-finora-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-finora-display text-lg tracking-tight">Finora</span>
          <Link
            to="/"
            className="text-sm text-finora-ink-muted transition-colors hover:text-finora-ink"
          >
            ← Back to portfolio
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
