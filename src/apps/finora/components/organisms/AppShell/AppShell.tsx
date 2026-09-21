import { useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'
import { NavItem } from '@molecules/NavItem/NavItem'
import { LocaleBadge } from '@molecules/LocaleBadge/LocaleBadge'
import { Icon } from '@atoms/Icon/Icon'
import { useTheme } from '@context/ThemeContext'
import s from './AppShell.module.css'

const BOTTOM_NAV_LEFT_DEFS = [
  { labelKey: 'nav.dashboard', to: '/finora', icon: <Icon name="dashboard" className={s.navIcon} /> },
  { labelKey: 'nav.transactions', to: '/finora/transactions', icon: <Icon name="transactions" className={s.navIcon} /> },
] as const

const BOTTOM_NAV_RIGHT_DEFS = [
  { labelKey: 'nav.budgets', to: '/finora/budgets', icon: <Icon name="budgets" className={s.navIcon} /> },
  { labelKey: 'nav.analytics', to: '/finora/analytics', icon: <Icon name="analytics" className={s.navIcon} /> },
  { labelKey: 'nav.goals', to: '/finora/goals', icon: <Icon name="goals" className={s.navIcon} /> },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { theme } = useTheme()

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  return (
    <div className={s.shell} data-theme={theme}>
      <Sidebar />

      <header className={s.mobileHeader}>
        <span className={s.brandMark}>
          <Icon name="brand-mark" className={s.brandMarkIcon} />
        </span>
        <span className={s.brandName}>Finora</span>
        <LocaleBadge />
      </header>

      <main className={s.main}>{children}</main>

      <nav className={s.bottomNav}>
        {BOTTOM_NAV_LEFT_DEFS.map((item) => (
          <NavItem key={item.labelKey} variant="bottom" label={t(item.labelKey)} icon={item.icon} to={item.to} />
        ))}

        <button
          id="mobile-add-transaction-button"
          data-testid="mobile-add-transaction-button"
          type="button"
          onClick={handleAddTransactionClick}
          aria-label={t('addTransaction')}
          className={s.addButton}
        >
          <Icon name="plus" className={s.addButtonIcon} />
        </button>

        {BOTTOM_NAV_RIGHT_DEFS.map((item) => (
          <NavItem key={item.labelKey} variant="bottom" label={t(item.labelKey)} icon={item.icon} to={item.to} />
        ))}
      </nav>
    </div>
  )
}
