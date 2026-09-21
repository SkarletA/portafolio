import type { ButtonHTMLAttributes, ReactNode } from 'react'
import cn from 'clsx'
import s from './Button.module.css'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  /** Unique DOM id, required so every button can be addressed individually. */
  id: string
  /** Button label/content. */
  children: ReactNode
  /** `primary` for the main call to action on a screen, `secondary` for a lower-emphasis action. */
  variant?: 'primary' | 'secondary'
}

/** A clickable action button, in Finora's primary (filled) or secondary (outlined) style. */
export function Button({ id, children, variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      id={id}
      type={type}
      className={cn(s.button, variant === 'primary' ? s.primary : s.secondary, className)}
      {...props}
    >
      {children}
    </button>
  )
}
