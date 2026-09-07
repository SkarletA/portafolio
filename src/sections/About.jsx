import { profile } from '../data/profile'

export function About() {
  return (
    <section id="about" className="border-t border-paper/10">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[220px_1fr]">
        <h2 className="font-display text-3xl text-paper md:text-4xl">About</h2>
        <div className="space-y-5 text-lg leading-relaxed text-paper-muted">
          {profile.summary.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          <ul className="flex flex-wrap gap-2 pt-2">
            {profile.competencies.map((item) => (
              <li
                key={item}
                className="rounded-full border border-paper/15 px-3 py-1 text-sm text-paper-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
