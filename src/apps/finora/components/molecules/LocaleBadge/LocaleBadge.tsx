import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@context/CurrencyContext'
import { useLanguage } from '@context/LanguageContext'
import s from './LocaleBadge.module.css'

export function LocaleBadge() {
  const { t } = useTranslation('common')
  const { language } = useLanguage()
  const { currency } = useCurrency()

  return (
    <Link
      to="/finora/settings"
      className={s.badge}
      aria-label={t('localeBadge.ariaLabel', { language: language.toUpperCase(), currency })}
      data-testid="locale-badge-settings-link"
    >
      {language.toUpperCase()} · {currency}
    </Link>
  )
}
