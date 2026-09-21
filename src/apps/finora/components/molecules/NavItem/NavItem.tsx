import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import cn from 'clsx'
import s from './NavItem.module.css'

interface NavItemProps {
  label: string
  icon: ReactNode
  /** Route to link to; omitted renders a disabled, non-interactive item. */
  to?: string
  /** `sidebar` for the desktop side nav, `bottom` for the mobile tab bar. */
  variant?: 'sidebar' | 'bottom'
}

/** A single navigation link, highlighted when its route is the current page. */
export function NavItem({ label, icon, to, variant = 'sidebar' }: NavItemProps) {
  const baseClass = variant === 'sidebar' ? s.item : s.itemBottom

  if (!to) {
    return (
      <span aria-disabled="true" className={cn(baseClass, s.disabled)}>
        {icon}
        {label}
      </span>
    )
  }

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        cn(
          baseClass,
          isActive ? (variant === 'sidebar' ? s.activeSidebar : s.activeBottom) : s.inactive
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
