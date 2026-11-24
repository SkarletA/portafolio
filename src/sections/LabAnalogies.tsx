import { useTranslation } from 'react-i18next'
import { Card } from '@portfolio-components/molecules/Card/Card'
import { PortraitTile } from '@portfolio-components/atoms/PortraitTile/PortraitTile'
import s from './LabAnalogies.module.css'

const ITEM_KEYS = ['method', 'equations', 'catalysts'] as const
const ACCENT_COLOR = 'var(--color-teal)'

export function LabAnalogies() {
  const { t } = useTranslation('lab')

  return (
    <section id="lab" className={s.section}>
      <div className={s.inner}>
        <div className={s.headerRow}>
          <div className={s.portraitWrap}>
            <PortraitTile index={0} symbol="Sk" name="Skarlet" alt={t('portraitAlt')} base="/portrait" widths={[480, 960]} />
          </div>
          <div className={s.headingBlock}>
            <div className={s.heading}>
              <span className={s.number}>01</span>
              <h2 className={s.title}>{t('heading')}</h2>
            </div>
            <p className={s.intro}>{t('intro')}</p>
          </div>
        </div>
        <div className={s.grid}>
          {ITEM_KEYS.map((key) => (
            <Card key={key} accentColor={ACCENT_COLOR} testId={`lab-analogy-${key}-card`}>
              <p className={s.eyebrow}>
                {t(`items.${key}.from`)} <span className={s.arrow} aria-hidden="true">→</span> {t(`items.${key}.to`)}
              </p>
              <h3 className={s.cardTitle}>{t(`items.${key}.title`)}</h3>
              <p className={s.cardDescription}>{t(`items.${key}.description`)}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
