import { Button } from '../components/atoms/Button/Button'

export function Home() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-finora-accent">
        Finora
      </p>
      <h1 className="mt-4 font-finora-display text-4xl text-finora-ink md:text-5xl">
        Personal finance, coming together
      </h1>
      <p className="mt-6 text-lg text-finora-ink-muted">
        Finora is being built as a real product inside this portfolio — expense
        tracking, budgets, and insights are on the way.
      </p>
      <div className="mt-10">
        <Button>Get notified</Button>
      </div>
    </section>
  )
}
