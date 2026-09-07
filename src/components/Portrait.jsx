import { useState } from 'react'
import { profile } from '../data/profile'

const PORTRAIT_SRC = '/portrait.jpeg'

export function Portrait() {
  const [loaded, setLoaded] = useState(false)

  return (
    <figure className="mx-auto w-full max-w-sm">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-dashed border-paper/25 bg-ink-soft">
        {!loaded ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="font-display text-5xl text-ember" aria-hidden="true">
              SA
            </span>
            <p className="text-sm font-medium text-paper">Professional photo</p>
            <p className="text-sm leading-relaxed text-paper-muted">
              Add your portrait as{' '}
              <code className="rounded bg-ink px-1.5 py-0.5 text-ember-soft">
                public/portrait.jpeg
              </code>
            </p>
          </div>
        ) : null}
        <img
          src={PORTRAIT_SRC}
          alt={`Professional portrait of ${profile.name}`}
          className={
            loaded ? 'h-full w-full object-cover object-top' : 'hidden'
          }
          onLoad={() => setLoaded(true)}
        />
      </div>
      <figcaption className="sr-only">
        Space reserved for a professional photograph of {profile.name}.
      </figcaption>
    </figure>
  )
}
