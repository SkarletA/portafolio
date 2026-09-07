import { finora } from '../projects/finora/meta'

export function Projects() {
  return (
    <section id="projects" className="border-t border-paper/10">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-12 font-display text-3xl text-paper md:text-4xl">
          Selected work
        </h2>
        <article className="rounded-2xl border border-paper/10 bg-ink-soft p-8 md:p-12">
          <p className="mb-3 text-sm uppercase tracking-[0.16em] text-ember">
            Featured · {finora.status}
          </p>
          <h3 className="font-display text-4xl text-paper">{finora.name}</h3>
          <p className="mt-4 max-w-2xl text-lg text-paper-muted">{finora.tagline}</p>
          <p className="mt-3 max-w-2xl text-paper-muted">{finora.description}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {finora.highlights.map((item) => (
              <li
                key={item}
                className="rounded-full border border-paper/15 px-3 py-1 text-sm text-paper-muted"
              >
                {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
