import { profile } from '@portfolio-data/profile'
import s from './About.module.css'

export function About() {
  return (
    <section id="about" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>About</h2>
        <div className={s.content}>
          {profile.summary.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          <ul className={s.competencies}>
            {profile.competencies.map((item) => (
              <li key={item} className={s.competency}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
