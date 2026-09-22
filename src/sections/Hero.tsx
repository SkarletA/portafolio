import { Portrait } from '@portfolio-components/atoms/Portrait'
import { profile } from '@portfolio-data/profile'
import s from './Hero.module.css'

export function Hero() {
  return (
    <section id="top" className={s.section}>
      <div>
        <p className={s.eyebrow}>{profile.role}</p>
        <h1 className={s.name}>{profile.name}</h1>
        <p className={s.tagline}>
          Building and scaling e-commerce platforms across Mexico, Chile, and Colombia — with product thinking,
          frontend architecture, and cross-functional leadership.
        </p>
        <p className={s.meta}>
          {profile.location} · {profile.availability}
        </p>
      </div>
      <Portrait />
    </section>
  )
}
