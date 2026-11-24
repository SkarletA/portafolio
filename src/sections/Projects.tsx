import { useTranslation } from 'react-i18next'
import { Card } from '@portfolio-components/molecules/Card/Card'
import { finora } from '../projects/finora/meta'
import { salsasTovar } from '../projects/salsas-tovar/meta'
import type { ProjectMeta } from '../projects/types'
import s from './Projects.module.css'

const BEN_AND_FRANK = {
  symbol: 'Bf',
  accentColor: '#2dd4bf',
  tags: ['react', 'nextjs', 'algolia', 'awsEks', 'odoo'],
}

interface ProjectCardProps {
  index: number
  meta: Pick<ProjectMeta, 'symbol' | 'accentColor' | 'tags' | 'href'>
  testId: string
  children: React.ReactNode
}

function ProjectCard({ index, meta, testId, children }: ProjectCardProps) {
  const { t } = useTranslation('projects')

  return (
    <Card accentColor={meta.accentColor} href={meta.href} testId={testId}>
      <div className={s.symbol}>
        <small>{String(index).padStart(2, '0')}</small>
        <strong>{meta.symbol}</strong>
      </div>
      {children}
      <ul className={s.tags}>
        {meta.tags.map((tagKey) => (
          <li key={tagKey} className={s.tag}>
            {t(`tags.${tagKey}`)}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function Projects() {
  const { t } = useTranslation('projects')

  return (
    <section id="proyectos" className={s.section}>
      <div className={s.inner}>
        <div className={s.heading}>
          <span className={s.number}>04</span>
          <h2 className={s.title}>{t('heading')}</h2>
        </div>
        <div className={s.grid}>
          <ProjectCard index={1} meta={finora} testId="projects-finora-card">
            <h3 className={s.cardTitle}>{finora.name}</h3>
            <p className={s.cardDescription}>{t('cards.finora.description')}</p>
            <span className={s.cta}>{t('cards.finora.cta')}</span>
          </ProjectCard>

          <ProjectCard index={2} meta={salsasTovar} testId="projects-salsas-tovar-card">
            <h3 className={s.cardTitle}>{salsasTovar.name}</h3>
            <p className={s.cardDescription}>{t('cards.salsasTovar.description')}</p>
            <span className={s.cta}>{t('cards.salsasTovar.cta')}</span>
          </ProjectCard>

          <ProjectCard index={3} meta={BEN_AND_FRANK} testId="projects-ben-and-frank-card">
            <h3 className={s.cardTitle}>
              Ben &amp; Frank <span className={s.cardSubtitle}>· {t('cards.benAndFrank.subtitle')}</span>
            </h3>
            <p className={s.cardDescription}>{t('cards.benAndFrank.description')}</p>
            <span className={s.cta}>{t('cards.benAndFrank.cta')}</span>
          </ProjectCard>
        </div>
      </div>
    </section>
  )
}
