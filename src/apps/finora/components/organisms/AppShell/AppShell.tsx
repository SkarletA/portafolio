import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { NavItem } from '../../molecules/NavItem/NavItem'
import { AnalyticsIcon, BrandMarkIcon, DashboardIcon, GoalsIcon, PlusIcon, TransactionsIcon } from './navIcons'
import s from './AppShell.module.css'

const BOTTOM_NAV_LEFT = [
  { label: 'Home', to: '/finora', icon: <DashboardIcon /> },
  { label: 'Activity', to: '/finora/transactions', icon: <TransactionsIcon /> },
]

const BOTTOM_NAV_RIGHT = [
  { label: 'Analytics', icon: <AnalyticsIcon /> },
  { label: 'Goals', icon: <GoalsIcon /> },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <Sidebar />

      <header className={s.mobileHeader}>
        <span className={s.brandMark}>
          <BrandMarkIcon />
        </span>
        Finora
      </header>

      <main className={s.main}>{children}</main>

      <nav className={s.bottomNav}>
        {BOTTOM_NAV_LEFT.map((item) => (
          <NavItem key={item.label} variant="bottom" label={item.label} icon={item.icon} to={item.to} />
        ))}

        <button
          id="mobile-add-transaction-button"
          data-testid="mobile-add-transaction-button"
          type="button"
          disabled
          title="Coming soon"
          aria-label="Add transaction (coming soon)"
          className={s.addButton}
        >
          <PlusIcon />
        </button>

        {BOTTOM_NAV_RIGHT.map((item) => (
          <NavItem key={item.label} variant="bottom" label={item.label} icon={item.icon} />
        ))}
      </nav>
    </div>
  )
}
