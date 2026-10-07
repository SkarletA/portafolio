import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import cn from 'clsx'
import { BottomSheet } from '@atoms/BottomSheet/BottomSheet'
import { Icon, type IconName } from '@atoms/Icon/Icon'
import s from './MoreNav.module.css'

const MORE_DESTINATIONS: { labelKey: string; to: string; icon: IconName; testId: string }[] = [
  { labelKey: 'nav.goals', to: '/finora/goals', icon: 'goals', testId: 'goals' },
  { labelKey: 'nav.recurring', to: '/finora/recurring', icon: 'recurring', testId: 'recurring' },
  { labelKey: 'nav.settings', to: '/finora/settings', icon: 'settings', testId: 'settings' },
]

/**
 * The mobile bottom nav's "More" tab: a button that opens a bottom sheet
 * listing Goals, Recurring and Settings, which otherwise have no tab of
 * their own on a phone-width viewport (Material/Apple cap a bottom bar at
 * five destinations). Marked active both while the sheet is open and while
 * the current route is one of the three it leads to - landing on
 * /finora/goals directly (e.g. from a link) must not leave the bar
 * unmarked.
 */
export function MoreNav() {
  const { t } = useTranslation('common')
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const isOnDestination = MORE_DESTINATIONS.some((destination) => destination.to === location.pathname)
  const isActive = open || isOnDestination

  const handleToggleClick = useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleToggleClick}
        className={cn(s.item, isActive ? s.active : s.inactive)}
        data-testid="mobile-more-button"
      >
        <Icon name="more" className={s.navIcon} />
        {t('nav.more')}
      </button>

      <BottomSheet open={open} onClose={handleClose} ariaLabel={t('nav.more')} testId="mobile-more-sheet">
        {MORE_DESTINATIONS.map((destination) => (
          <Link
            key={destination.to}
            to={destination.to}
            onClick={handleClose}
            className={s.row}
            data-testid={`mobile-more-row-${destination.testId}`}
          >
            <Icon name={destination.icon} className={s.navIcon} />
            <span className={s.rowLabel}>{t(destination.labelKey)}</span>
            <ChevronRight className={s.chevron} aria-hidden="true" />
          </Link>
        ))}
      </BottomSheet>
    </>
  )
}
