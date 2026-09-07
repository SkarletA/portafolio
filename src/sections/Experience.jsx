import { profile } from '../data/profile'

export function Experience() {
  return (
    <section id="experience" className="border-t border-paper/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 font-display text-3xl text-paper md:text-4xl">
          Experience
        </h2>
        <ul className="space-y-14">
          {profile.experience.map((role) => (
            <li key={`${role.title}-${role.dates}`}>
              <div className="grid gap-2 md:grid-cols-[220px_1fr] md:gap-10">
                <p className="text-sm text-ember">{role.dates}</p>
                <div>
                  <h3 className="text-xl font-medium text-paper">{role.title}</h3>
                  <p className="mt-1 text-paper-muted">
                    {role.company} — {role.place}
                  </p>
                  {role.context ? (
                    <p className="mt-2 text-sm italic text-paper-muted/90">{role.context}</p>
                  ) : null}
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-paper-muted">
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
