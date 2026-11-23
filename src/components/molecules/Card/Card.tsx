import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import s from './Card.module.css'

interface CardProps {
  accentColor: string
  /** Ruta interna (react-router). Si se da, la tarjeta completa es un <Link>; si no, es un <div>. */
  href?: string
  testId: string
  children: ReactNode
}

export function Card({ accentColor, href, testId, children }: CardProps) {
  const style = { '--c': accentColor } as React.CSSProperties

  if (href) {
    return (
      <Link to={href} className={s.card} style={style} data-testid={testId}>
        {children}
      </Link>
    )
  }

  return (
    <div className={s.card} style={style} data-testid={testId}>
      {children}
    </div>
  )
}
