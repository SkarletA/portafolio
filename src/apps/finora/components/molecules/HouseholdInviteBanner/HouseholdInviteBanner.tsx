import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import s from './HouseholdInviteBanner.module.css'

interface HouseholdInviteBannerProps {
  /** The inviter's display name, or null when their profile has no name set yet. */
  inviterName: string | null
  onAccept: () => void
  onDecline: () => void
  /** Disables both actions while a response is in flight. */
  pending: boolean
  /** Already-translated message from the last failed response, if any. */
  error: string | null
}

/** Shown app-wide (in AppShell) to a user with a pending household invitation, so it appears regardless of which page they're on. */
export function HouseholdInviteBanner({ inviterName, onAccept, onDecline, pending, error }: HouseholdInviteBannerProps) {
  const { t } = useTranslation('household')

  return (
    <div className={s.banner} role="status" data-testid="household-invite-banner">
      <div>
        <p className={s.message}>
          {inviterName ? t('banner.invitedBy', { name: inviterName }) : t('banner.invitedByUnknown')}
        </p>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
      </div>
      <div className={s.actions}>
        <Button
          id="household-invite-banner-decline-button"
          data-testid="household-invite-banner-decline-button"
          variant="secondary"
          onClick={onDecline}
          disabled={pending}
        >
          {t('banner.decline')}
        </Button>
        <Button
          id="household-invite-banner-accept-button"
          data-testid="household-invite-banner-accept-button"
          onClick={onAccept}
          disabled={pending}
        >
          {t('banner.accept')}
        </Button>
      </div>
    </div>
  )
}
