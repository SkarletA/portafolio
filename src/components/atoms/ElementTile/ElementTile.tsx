import { useCallback, useState } from 'react'
import cn from 'clsx'
import {
  SiAlgolia,
  SiGrafana,
  SiNextdotjs,
  SiNodedotjs,
  SiOdoo,
  SiReact,
  SiSentry,
  SiStorybook,
  SiSupabase,
  SiTypescript,
  SiVercel,
  SiVitest,
} from '@icons-pack/react-simple-icons'
import s from './ElementTile.module.css'

/** `icon` slug (ElementEntry) -> its Si* component. Only the icons this table actually uses are imported. */
const ICONS: Record<string, typeof SiReact> = {
  react: SiReact,
  nextdotjs: SiNextdotjs,
  typescript: SiTypescript,
  storybook: SiStorybook,
  vitest: SiVitest,
  nodedotjs: SiNodedotjs,
  supabase: SiSupabase,
  algolia: SiAlgolia,
  odoo: SiOdoo,
  vercel: SiVercel,
  sentry: SiSentry,
  grafana: SiGrafana,
}

interface ElementTileProps {
  index: number
  symbol: string
  name: string
  accentColor: string
  icon: string | null
  blurb: string
  groupLabel: string
  flipLabel: string
  /** Initial flip state - only for Storybook, so the "flipped" and "missing icon" stories can show the back face without a play function. */
  defaultFlipped?: boolean
}

export function ElementTile({
  index,
  symbol,
  name,
  accentColor,
  icon,
  blurb,
  groupLabel,
  flipLabel,
  defaultFlipped = false,
}: ElementTileProps) {
  const [flipped, setFlipped] = useState(defaultFlipped)
  const Icon = icon ? ICONS[icon] : null

  const handleToggle = useCallback(() => {
    setFlipped((current) => !current)
  }, [])

  return (
    <button
      type="button"
      className={s.tile}
      style={{ '--c': accentColor } as React.CSSProperties}
      data-testid={`element-tile-${symbol.toLowerCase()}`}
      aria-pressed={flipped}
      aria-label={flipLabel}
      onClick={handleToggle}
    >
      <span className={s.inner}>
        <span className={cn(s.face, s.front)} aria-hidden={flipped}>
          <small className={s.index}>{String(index).padStart(2, '0')}</small>
          <strong className={s.symbol}>{symbol}</strong>
          <span className={s.name}>{name}</span>
        </span>
        <span className={cn(s.face, s.back)} aria-hidden={!flipped}>
          <span className={s.icon}>
            {Icon ? <Icon size={26} color="currentColor" /> : <span className={s.monogram}>{symbol}</span>}
          </span>
          <span className={s.backName}>{name}</span>
          <span className={s.blurb}>{blurb}</span>
          <span className={s.groupLabel}>{groupLabel}</span>
        </span>
      </span>
    </button>
  )
}
