import type { ReactElement } from 'react'
import cn from 'clsx'
import s from './Icon.module.css'

export type IconName =
  | 'utensils'
  | 'home'
  | 'car'
  | 'shopping-bag'
  | 'tv'
  | 'brand-mark'
  | 'dashboard'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'goals'
  | 'settings'
  | 'plus'
  | 'search'

interface IconProps {
  name: IconName
  className?: string
}

function UtensilsGlyph() {
  return (
    <>
      <path d="M7 2 V9 a2 2 0 0 0 4 0 V2" />
      <path d="M9 11 V22" />
      <path d="M17 2 C15 2 15 6 15 8 a2 2 0 0 0 2 2 V22" />
    </>
  )
}

function HomeGlyph() {
  return (
    <>
      <path d="M3 11 L12 3 L21 11" />
      <path d="M5 10 V21 H19 V10" />
    </>
  )
}

function CarGlyph() {
  return (
    <>
      <path d="M3 13 L5 7 H19 L21 13" />
      <rect x="2" y="13" width="20" height="6" rx="1.5" />
      <circle cx="7" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  )
}

function ShoppingBagGlyph() {
  return (
    <>
      <path d="M6 8 H18 L17 21 H7 Z" />
      <path d="M9 8 V6 a3 3 0 0 1 6 0 V8" />
    </>
  )
}

function TvGlyph() {
  return (
    <>
      <rect x="3" y="5" width="18" height="13" rx="1.5" />
      <path d="M9 21 H15" />
    </>
  )
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

const GLYPHS: Record<IconName, () => ReactElement> = {
  utensils: UtensilsGlyph,
  home: HomeGlyph,
  car: CarGlyph,
  'shopping-bag': ShoppingBagGlyph,
  tv: TvGlyph,
  'brand-mark': BrandMarkGlyph,
  dashboard: DashboardGlyph,
  transactions: TransactionsGlyph,
  budgets: BudgetsGlyph,
  analytics: AnalyticsGlyph,
  goals: GoalsGlyph,
  settings: SettingsGlyph,
  plus: PlusGlyph,
  search: SearchGlyph,
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
