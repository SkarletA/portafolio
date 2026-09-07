import { profile } from '../data/profile'

export function Education() {
  return (
    <section id="education" className="border-t border-paper/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 font-display text-3xl text-paper md:text-4xl">
          Education
        </h2>
        <ul className="space-y-8">
          {profile.education.map((item) => (
            <li key={item.title} className="grid gap-2 md:grid-cols-[220px_1fr] md:gap-10">
              <p className="text-sm text-ember">{item.dates}</p>
              <div>
                <h3 className="text-lg font-medium text-paper">{item.title}</h3>
                <p className="text-paper-muted">{item.org}</p>
                {item.detail ? (
                  <p className="mt-2 text-paper-muted">{item.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-3xl text-sm text-paper-muted">
          <span className="text-paper">Certifications: </span>
          {profile.certifications}
        </p>
        <p className="mt-3 text-sm text-paper-muted">
          <span className="text-paper">Languages: </span>
          {profile.languages.map((lang) => `${lang.name} — ${lang.level}`).join(' · ')}
        </p>
      </div>
    </section>
  )
}
