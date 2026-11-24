import { useTranslation } from 'react-i18next'
import { ElementTile } from '@portfolio-components/atoms/ElementTile/ElementTile'
import { GROUP_COLORS } from '@portfolio-data/groups'
import { profile } from '@portfolio-data/profile'
import s from './PeriodicTable.module.css'

export function PeriodicTable() {
  const { t } = useTranslation(['periodicTable', 'common'])

  return (
    <section id="tabla" className={s.section}>
      <div className={s.inner}>
        <div className={s.heading}>
          <span className={s.number}>05</span>
          <h2 className={s.title}>{t('heading')}</h2>
        </div>
        <p className={s.intro}>{t('intro')}</p>
        <div className={s.grid}>
          {profile.elements.map((element, i) => (
            <ElementTile
              key={element.symbol}
              index={i + 1}
              symbol={element.symbol}
              name={element.name}
              accentColor={GROUP_COLORS[element.group]}
              icon={element.icon}
              blurb={t(`elements.${element.symbol.toLowerCase()}.blurb`)}
              groupLabel={t(`groups.${element.group}`)}
              flipLabel={t('flipLabel', { name: element.name })}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
