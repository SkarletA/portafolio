import { useCallback, useState } from 'react'
import cn from 'clsx'
import { profile } from '@portfolio-data/profile'
import s from './Portrait.module.css'

const PORTRAIT_SRC = '/portrait.jpeg'

export function Portrait() {
  const [loaded, setLoaded] = useState(false)

  const handleImageLoad = useCallback(() => {
    setLoaded(true)
  }, [])

  return (
    <figure className={s.figure}>
      <div className={s.frame}>
        {!loaded ? (
          <div className={s.placeholder}>
            <span className={s.initials} aria-hidden="true">
              SA
            </span>
            <p className={s.placeholderTitle}>Professional photo</p>
            <p className={s.placeholderHint}>
              Add your portrait as <code className={s.placeholderCode}>public/portrait.jpeg</code>
            </p>
          </div>
        ) : null}
        <img
          src={PORTRAIT_SRC}
          alt={`Professional portrait of ${profile.name}`}
          className={cn(s.image, !loaded && s.imageHidden)}
          onLoad={handleImageLoad}
        />
      </div>
      <figcaption className={s.caption}>
        Space reserved for a professional photograph of {profile.name}.
      </figcaption>
    </figure>
  )
}
