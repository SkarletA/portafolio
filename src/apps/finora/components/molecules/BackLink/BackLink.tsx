import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@atoms/Icon/Icon'
import s from './BackLink.module.css'

interface BackLinkProps {
  /** Route of the screen this one came from. */
  to: string
  /** Where the link goes, e.g. "Back to goals". */
  children: ReactNode
  'data-testid'?: string
}

/** A link back to a form's list screen, so leaving a form does not depend on the side navigation. */
export function BackLink({ to, children, 'data-testid': testId }: BackLinkProps) {
  return (
    <Link to={to} className={s.link} data-testid={testId}>
      <Icon name="arrow-left" className={s.icon} />
      {children}
    </Link>
  )
}
