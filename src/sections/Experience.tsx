import { profile } from '@portfolio-data/profile'
import s from './Experience.module.css'

export function Experience() {
  return (
    <section id="experience" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>Experience</h2>
        <ul className={s.list}>
          {profile.experience.map((role) => (
            <li key={`${role.title}-${role.dates}`}>
              <div className={s.row}>
                <p className={s.date}>{role.dates}</p>
                <div>
                  <h3 className={s.roleTitle}>{role.title}</h3>
                  <p className={s.company}>
                    {role.company} — {role.place}
                  </p>
                  {role.context ? <p className={s.context}>{role.context}</p> : null}
                  <ul className={s.bullets}>
                    {role.bullets.map((bullet) => (
                      <li key={bullet.slice(0, 48)}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
