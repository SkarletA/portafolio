import { profile } from '@portfolio-data/profile'
import s from './Skills.module.css'

export function Skills() {
  return (
    <section id="skills" className={s.section}>
      <div className={s.inner}>
        <h2 className={s.title}>Technical skills</h2>
        <div className={s.grid}>
          {profile.skills.map((group) => (
            <div key={group.name}>
              <h3 className={s.groupTitle}>{group.name}</h3>
              <ul className={s.groupList}>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
