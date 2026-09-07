import { Portrait } from '../components/atoms/Portrait'
import { profile } from '../data/profile'

export function Hero() {
  return (
    <section
      id="top"
      className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-[minmax(0,1fr)_280px] md:pt-20 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div>
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-ember">
          {profile.role}
        </p>
        <h1 className="font-display text-5xl leading-[1.05] text-paper md:text-6xl lg:text-7xl">
          {profile.name}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper-muted">
          Building and scaling e-commerce platforms across Mexico, Chile, and
          Colombia — with product thinking, frontend architecture, and
          cross-functional leadership.
        </p>
        <p className="mt-4 text-sm text-paper-muted">
          {profile.location} · {profile.availability}
        </p>
      </div>
      <Portrait />
    </section>
  )
}
