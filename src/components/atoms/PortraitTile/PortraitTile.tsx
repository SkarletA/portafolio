import s from './PortraitTile.module.css'

interface PortraitTileProps {
  index: number
  symbol: string
  name: string
  alt: string
  /** Base path shared by the generated WebP variants, e.g. '/portrait' -> /portrait-480.webp, /portrait-960.webp. */
  base: string
  widths: [number, number]
  /** CSS object-position for the photo, so the face stays in frame across tile widths. Defaults to the top area of the photo. */
  focalPosition?: string
}

export function PortraitTile({ index, symbol, name, alt, base, widths, focalPosition = 'center 15%' }: PortraitTileProps) {
  const [smallWidth, largeWidth] = widths
  const smallHeight = Math.round((smallWidth * 4) / 3)

  return (
    <figure className={s.tile} data-testid="portrait-tile" style={{ '--pos': focalPosition } as React.CSSProperties}>
      <img
        src={`${base}-${smallWidth}.webp`}
        srcSet={`${base}-${smallWidth}.webp ${smallWidth}w, ${base}-${largeWidth}.webp ${largeWidth}w`}
        sizes="(min-width: 768px) 12rem, 9rem"
        alt={alt}
        width={smallWidth}
        height={smallHeight}
        loading="lazy"
        decoding="async"
        className={s.photo}
      />
      <span className={s.scrim} aria-hidden="true" />
      <span className={s.index} aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <figcaption className={s.caption}>
        <strong className={s.symbol}>{symbol}</strong>
        <span className={s.name}>{name}</span>
      </figcaption>
    </figure>
  )
}
