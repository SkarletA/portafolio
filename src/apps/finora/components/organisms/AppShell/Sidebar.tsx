import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { NavItem } from '../../molecules/NavItem/NavItem'
import { Icon } from '../../atoms/Icon/Icon'
import s from './Sidebar.module.css'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/finora', icon: <Icon name="dashboard" className={s.navIcon} /> },
  { label: 'Transactions', to: '/finora/transactions', icon: <Icon name="transactions" className={s.navIcon} /> },
  { label: 'Budgets', icon: <Icon name="budgets" className={s.navIcon} /> },
  { label: 'Analytics', icon: <Icon name="analytics" className={s.navIcon} /> },
  { label: 'Goals', icon: <Icon name="goals" className={s.navIcon} /> },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const initials = user?.email ? user.email[0].toUpperCase() : '?'

  const handleSignOutClick = useCallback(() => {
    signOut()
  }, [signOut])

  return (
    <aside className={s.sidebar}>
      <div className={s.brand}>
        <div className={s.brandMark}>
          <Icon name="brand-mark" className={s.brandMarkIcon} />
        </div>
        <span className={s.brandName}>Finora</span>
      </div>

      <nav className={s.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} label={item.label} icon={item.icon} to={item.to} />
        ))}
      </nav>

      <div className={s.bottomSection}>
        <NavItem label="Settings" icon={<Icon name="settings" className={s.navIcon} />} />
        <Link to="/" className={s.backLink} data-testid="sidebar-back-to-portfolio-link">
          ← Back to portfolio
        </Link>

        <div className={s.profile}>
          <div className={s.avatar}>{initials}</div>
          <p className={s.email}>{user?.email}</p>
          <button
            id="sidebar-sign-out-button"
            data-testid="sidebar-sign-out-button"
            type="button"
            onClick={handleSignOutClick}
            className={s.signOutButton}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
