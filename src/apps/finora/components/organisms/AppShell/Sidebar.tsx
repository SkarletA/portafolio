import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../context/AuthContext'
import { useProfile } from '../../../hooks/useProfile'
import { NavItem } from '../../molecules/NavItem/NavItem'
import { Icon } from '../../atoms/Icon/Icon'
import { Avatar } from '../../atoms/Avatar/Avatar'
import s from './Sidebar.module.css'

const NAV_ITEM_DEFS = [
  { labelKey: 'nav.dashboard', to: '/finora', icon: <Icon name="dashboard" className={s.navIcon} /> },
  { labelKey: 'nav.transactions', to: '/finora/transactions', icon: <Icon name="transactions" className={s.navIcon} /> },
  { labelKey: 'nav.budgets', to: '/finora/budgets', icon: <Icon name="budgets" className={s.navIcon} /> },
  { labelKey: 'nav.analytics', to: '/finora/analytics', icon: <Icon name="analytics" className={s.navIcon} /> },
  { labelKey: 'nav.goals', to: '/finora/goals', icon: <Icon name="goals" className={s.navIcon} /> },
] as const

export function Sidebar() {
  const { t } = useTranslation('common')
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.email || ''

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
        {NAV_ITEM_DEFS.map((item) => (
          <NavItem key={item.labelKey} label={t(item.labelKey)} icon={item.icon} to={item.to} />
        ))}
      </nav>

      <div className={s.bottomSection}>
        <NavItem
          label={t('nav.settings')}
          icon={<Icon name="settings" className={s.navIcon} />}
          to="/finora/settings"
        />
        <Link to="/" className={s.backLink} data-testid="sidebar-back-to-portfolio-link">
          {t('nav.backToPortfolio')}
        </Link>

        <div className={s.profile}>
          <Avatar
            userId={user?.id ?? ''}
            avatarUrl={profile?.avatarUrl}
            firstName={profile?.firstName}
            lastName={profile?.lastName}
            email={user?.email}
            size="sm"
          />
          <p className={s.email}>{displayName}</p>
          <button
            id="sidebar-sign-out-button"
            data-testid="sidebar-sign-out-button"
            type="button"
            onClick={handleSignOutClick}
            className={s.signOutButton}
          >
            {t('nav.signOut')}
          </button>
        </div>
      </div>
    </aside>
  )
}
