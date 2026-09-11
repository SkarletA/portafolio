import type { ButtonHTMLAttributes, ReactNode } from 'react'
import cn from 'clsx'
import s from './Button.module.css'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id'> {
  id: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

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
