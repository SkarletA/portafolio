import s from './ElementTile.module.css'

interface ElementTileProps {
  index: number
  symbol: string
  name: string
  accentColor: string
}

export function ElementTile({ index, symbol, name, accentColor }: ElementTileProps) {
  return (
    <div
      className={s.tile}
      style={{ '--c': accentColor } as React.CSSProperties}
      data-testid={`element-tile-${symbol.toLowerCase()}`}
    >
      <small className={s.index}>{String(index).padStart(2, '0')}</small>
      <strong className={s.symbol}>{symbol}</strong>
      <span className={s.name}>{name}</span>
    </div>
  )
}
