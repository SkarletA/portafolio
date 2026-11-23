import { Suspense, lazy } from 'react'
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

const HIGHLIGHT_WORDS = ['química', 'código']

export function Hero() {
  const taglineParts = profile.tagline.split(new RegExp(`(${HIGHLIGHT_WORDS.join('|')})`))

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
          {taglineParts.map((part, i) =>
            HIGHLIGHT_WORDS.includes(part) ? (
              <em key={i} className={s.highlight}>
                {part}
              </em>
            ) : (
              part
            )
          )}
        </p>
        <p className={s.sub}>{profile.heroSub}</p>
        <div className={s.ctaRow}>
          <a className={s.ctaPrimary} href="#proyectos" data-testid="hero-view-projects-link">
            Ver proyectos
          </a>
          <a className={s.ctaSecondary} href="#contacto" data-testid="hero-talk-link">
            Hablemos
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
