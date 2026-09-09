import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { NavItem } from '../../molecules/NavItem/NavItem'
import { Icon } from '../../atoms/Icon/Icon'
import s from './AppShell.module.css'

const BOTTOM_NAV_LEFT = [
  { label: 'Home', to: '/finora', icon: <Icon name="dashboard" className={s.navIcon} /> },
  { label: 'Activity', to: '/finora/transactions', icon: <Icon name="transactions" className={s.navIcon} /> },
]

const BOTTOM_NAV_RIGHT = [
  { label: 'Analytics', icon: <Icon name="analytics" className={s.navIcon} /> },
  { label: 'Goals', icon: <Icon name="goals" className={s.navIcon} /> },
]

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  return (
    <div className={s.shell}>
      <Sidebar />

      <header className={s.mobileHeader}>
        <span className={s.brandMark}>
          <Icon name="brand-mark" className={s.brandMarkIcon} />
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
          onClick={handleAddTransactionClick}
          aria-label="Add transaction"
          className={s.addButton}
        >
          <Icon name="plus" className={s.addButtonIcon} />
        </button>

        {BOTTOM_NAV_RIGHT.map((item) => (
          <NavItem key={item.label} variant="bottom" label={item.label} icon={item.icon} />
        ))}
      </nav>
    </div>
  )
}
