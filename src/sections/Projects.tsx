import { Link } from 'react-router-dom'
import { finora } from '../projects/finora/meta'
import s from './Projects.module.css'

export function Projects() {
  return (
    <section id="projects" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>Selected work</h2>
        <article className={s.card}>
          <p className={s.eyebrow}>Featured · {finora.status}</p>
          <h3 className={s.projectTitle}>{finora.name}</h3>
          <p className={s.tagline}>{finora.tagline}</p>
          <p className={s.description}>{finora.description}</p>
          <ul className={s.highlights}>
            {finora.highlights.map((item) => (
              <li key={item} className={s.highlight}>
                {item}
              </li>
            ))}
          </ul>
          <Link to="/finora" className={s.link} data-testid="projects-finora-link">
            View project →
          </Link>
        </article>
      </div>
    </section>
  )
}
