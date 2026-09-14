import cn from 'clsx'
import s from './Avatar.module.css'

const COLOR_PALETTE = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-purple-500',
]

interface AvatarProps {
  userId: string
  avatarUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const first = firstName?.trim()[0]
  const last = lastName?.trim()[0]

  if (first && last) return `${first}${last}`.toUpperCase()
  if (first) return first.toUpperCase()
  if (email) return email[0]?.toUpperCase() ?? '?'
  return '?'
}

// A simple deterministic hash so the same user always gets the same fallback
// color, across sessions and reloads, without storing anything.
function getColorClass(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return COLOR_PALETTE[hash % COLOR_PALETTE.length]
}

export function Avatar({ userId, avatarUrl, firstName, lastName, email, size = 'md' }: AvatarProps) {
  if (avatarUrl) {
    const name = [firstName, lastName].filter(Boolean).join(' ') || email || 'User'
    return <img src={avatarUrl} alt={`${name}'s avatar`} className={cn(s.avatar, s[size])} />
  }

  return (
    <div className={cn(s.avatar, s[size], s.fallback, getColorClass(userId))}>
      {getInitials(firstName, lastName, email)}
    </div>
  )
}
