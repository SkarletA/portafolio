import { profile } from '@portfolio-data/profile'
import s from './Education.module.css'

export function Education() {
  return (
    <section id="education" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>Education</h2>
        <ul className={s.list}>
          {profile.education.map((item) => (
            <li key={item.title} className={s.item}>
              <p className={s.date}>{item.dates}</p>
              <div>
                <h3 className={s.itemTitle}>{item.title}</h3>
                <p className={s.org}>{item.org}</p>
                {item.detail ? <p className={s.detail}>{item.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <p className={s.footerLine}>
          <span className={s.footerLabel}>Certifications: </span>
          {profile.certifications}
        </p>
        <p className={s.footerLineTight}>
          <span className={s.footerLabel}>Languages: </span>
          {profile.languages.map((lang) => `${lang.name} — ${lang.level}`).join(' · ')}
        </p>
      </div>
    </section>
  )
}
