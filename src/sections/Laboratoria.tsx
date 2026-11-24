import { useTranslation } from 'react-i18next'
import s from './Laboratoria.module.css'

const TIMELINE_ITEMS = [
  { key: 'trivia', hasDetail: false, color: 'var(--color-teal)' },
  { key: 'cardValidation', hasDetail: false, color: 'var(--color-teal)' },
  { key: 'dataLovers', hasDetail: false, color: 'var(--color-amber)' },
  { key: 'socialNetwork', hasDetail: true, color: 'var(--color-amber)' },
  { key: 'labNotes', hasDetail: false, color: 'var(--color-scarlet)' },
  { key: 'burgerQueenClient', hasDetail: true, color: 'var(--color-scarlet)' },
  { key: 'burgerQueenApi', hasDetail: true, color: 'var(--color-scarlet)' },
] as const

export function Laboratoria() {
  const { t } = useTranslation('laboratoria')

  return (
    <section id="laboratoria" className={s.section}>
      <div className={s.inner}>
        <div className={s.heading}>
          <span className={s.number}>02</span>
          <h2 className={s.title}>{t('heading')}</h2>
        </div>
        <div className={s.grid}>
          <div className={s.story}>
            <p className={s.when}>{t('when')}</p>
            <p className={s.paragraph}>{t('intro1')}</p>
            <p className={s.paragraph}>{t('intro2')}</p>
          </div>
          <ol className={s.timeline}>
            {TIMELINE_ITEMS.map((item, i) => (
              <li key={item.key} className={s.step} data-testid={`laboratoria-step-${item.key}`}>
                <span className={s.dot} style={{ '--c': item.color } as React.CSSProperties} />
                <div className={s.stepCard}>
                  <span className={s.stepIndex}>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className={s.stepTitle}>{t(`timeline.${item.key}.title`)}</p>
                    {item.hasDetail ? <p className={s.stepDetail}>{t(`timeline.${item.key}.detail`)}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
