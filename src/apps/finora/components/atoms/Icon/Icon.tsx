import type { ReactElement } from 'react'
import cn from 'clsx'
import s from './Icon.module.css'

export type IconName =
  | 'brand-mark'
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'goals'
  | 'settings'
  | 'plus'
  | 'search'
  | 'edit'
  | 'trash'

interface IconProps {
  name: IconName
  className?: string
}

function BrandMarkGlyph() {
  return (
    <>
      <path d="M4 17 L10 11 L14 15 L20 7" />
      <path d="M15 7 L20 7 L20 12" />
    </>
  )
}

function DashboardGlyph() {
  return (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  )
}

function TransactionsGlyph() {
  return (
    <>
      <path d="M7 10 L3 6 L7 2" />
      <path d="M3 6 H15 a4 4 0 0 1 4 4 v1" />
      <path d="M17 14 L21 18 L17 22" />
      <path d="M21 18 H9 a4 4 0 0 1 -4 -4 v-1" />
    </>
  )
}

function BudgetsGlyph() {
  return (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10 H21" />
      <path d="M7 15 H12" />
    </>
  )
}

function AnalyticsGlyph() {
  return (
    <>
      <path d="M3 20 V4" />
      <path d="M3 20 H21" />
      <path d="M7 16 V11" />
      <path d="M12 16 V7" />
      <path d="M17 16 V13" />
    </>
  )
}

function GoalsGlyph() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  )
}

function SettingsGlyph() {
  return (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </>
  )
}

function PlusGlyph() {
  return (
    <>
      <path d="M12 5 V19" />
      <path d="M5 12 H19" />
    </>
  )
}

function SearchGlyph() {
  return (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21 L16.6 16.6" />
    </>
  )
}

function EditGlyph() {
  return (
    <>
      <path d="M12 20 H21" />
      <path d="M16.5 3.5 A2.121 2.121 0 0 1 19.5 6.5 L8 18 L4 19 L5 15 Z" />
    </>
  )
}

function TrashGlyph() {
  return (
    <>
      <path d="M4 7 H20" />
      <path d="M9 7 V4 H15 V7" />
      <path d="M6 7 L7 21 H17 L18 7" />
      <path d="M10 11 V17" />
      <path d="M14 11 V17" />
    </>
  )
}

const GLYPHS: Record<IconName, () => ReactElement> = {
  'brand-mark': BrandMarkGlyph,
  dashboard: DashboardGlyph,
  transactions: TransactionsGlyph,
  budgets: BudgetsGlyph,
  analytics: AnalyticsGlyph,
  goals: GoalsGlyph,
  settings: SettingsGlyph,
  plus: PlusGlyph,
  search: SearchGlyph,
  edit: EditGlyph,
  trash: TrashGlyph,
}

export function Icon({ name, className }: IconProps) {
  const Glyph = GLYPHS[name]

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(s.icon, className)}
      aria-hidden="true"
    >
      <Glyph />
    </svg>
  )
}
