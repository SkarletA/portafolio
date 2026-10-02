import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { Icon } from '@atoms/Icon/Icon'
import s from './NotFound.module.css'

/** Shown for any /finora/* route that doesn't match - stays inside AppShell, public (no auth required). */
export function NotFound() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  const handleBackClick = useCallback(() => {
    navigate('/finora')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.mark}>
        <Icon name="brand-mark" className={s.markIcon} />
      </div>
      <p className={s.code}>404</p>
      <h1 className={s.title}>{t('notFound.title')}</h1>
      <p className={s.description}>{t('notFound.description')}</p>
      <Button id="not-found-back-button" data-testid="not-found-back-button" onClick={handleBackClick}>
        {t('notFound.backButton')}
      </Button>
    </section>
  )
}
