import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { NavItem } from '../../molecules/NavItem/NavItem'
import {
  AnalyticsIcon,
  BrandMarkIcon,
  BudgetsIcon,
  DashboardIcon,
  GoalsIcon,
  SettingsIcon,
  TransactionsIcon,
} from './navIcons'
import s from './Sidebar.module.css'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/finora', icon: <DashboardIcon /> },
  { label: 'Transactions', to: '/finora/transactions', icon: <TransactionsIcon /> },
  { label: 'Budgets', icon: <BudgetsIcon /> },
  { label: 'Analytics', icon: <AnalyticsIcon /> },
  { label: 'Goals', icon: <GoalsIcon /> },
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
          <BrandMarkIcon />
        </div>
        <span className={s.brandName}>Finora</span>
      </div>

      <nav className={s.nav}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} label={item.label} icon={item.icon} to={item.to} />
        ))}
      </nav>

      <div className={s.bottomSection}>
        <NavItem label="Settings" icon={<SettingsIcon />} />
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
