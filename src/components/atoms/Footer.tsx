import { useTranslation } from 'react-i18next'
import s from './Footer.module.css'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <p>© {new Date().getFullYear()} Skarlet Araque</p>
        <p>{t('footer.madeWith')}</p>
      </div>
    </footer>
  )
}
