import { Suspense, lazy } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StaticMoleculeFallback } from '@portfolio-components/three/StaticMoleculeFallback'
import { profile } from '@portfolio-data/profile'
import s from './Hero.module.css'

// El chunk de three.js solo se descarga cuando el Hero realmente se monta,
// no como parte del bundle principal del portafolio. Mientras carga, se ve
// el mismo SVG estático que MoleculeHero usa como fallback sin WebGL, para
// no dar un salto de layout.
const MoleculeHero = lazy(() =>
  import('@portfolio-components/three/MoleculeHero').then((module) => ({ default: module.MoleculeHero }))
)

export function Hero() {
  const { t } = useTranslation()

  return (
    <section id="top" className={s.section}>
      <div>
        <p className={s.eyebrow}>// {profile.role}</p>
        <h1 className={s.name}>
          Skarlet
          <br />
          <span className={s.nameGradient}>Araque</span>
        </h1>
        <p className={s.tagline}>
          <Trans i18nKey="hero.tagline" components={{ em: <em className={s.highlight} /> }} />
        </p>
        <p className={s.sub}>{t('hero.sub')}</p>
        <div className={s.ctaRow}>
          <a className={s.ctaPrimary} href="#proyectos" data-testid="hero-view-projects-link">
            {t('hero.ctaProjects')}
          </a>
          <a className={s.ctaSecondary} href="#contacto" data-testid="hero-talk-link">
            {t('hero.ctaContact')}
          </a>
        </div>
      </div>
      <Suspense
        fallback={
          <div className={s.stagePlaceholder}>
            <StaticMoleculeFallback compiled={false} />
          </div>
        }
      >
        <MoleculeHero />
      </Suspense>
    </section>
  )
}
