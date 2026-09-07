import { profile } from '../data/profile'

export function Skills() {
  return (
    <section id="skills" className="border-t border-paper/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 font-display text-3xl text-paper md:text-4xl">
          Technical skills
        </h2>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {profile.skills.map((group) => (
            <div key={group.name}>
              <h3 className="mb-4 text-sm uppercase tracking-[0.16em] text-ember">
                {group.name}
              </h3>
              <ul className="space-y-2 text-paper-muted">
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
