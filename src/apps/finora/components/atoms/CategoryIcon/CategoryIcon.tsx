import {
  Beef,
  Car,
  CreditCard,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Plane,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Tv,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import cn from 'clsx'
import s from './CategoryIcon.module.css'

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  beef: Beef,
  'shopping-cart': ShoppingCart,
  home: Home,
  car: Car,
  'shopping-bag': ShoppingBag,
  tv: Tv,
  wallet: Wallet,
  'credit-card': CreditCard,
  plane: Plane,
  heart: Heart,
  'graduation-cap': GraduationCap,
  gift: Gift,
  dumbbell: Dumbbell,
  tag: Tag,
}

// Default icon for categories created through a quick path (e.g. the
// "Others" subcategory shortcut) that doesn't show an icon picker.
export const DEFAULT_CATEGORY_ICON = 'tag'

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

interface CategoryIconProps {
  /** One of the known icon keys (see CATEGORY_ICON_NAMES); unknown or null falls back to text. */
  name: string | null
  /** Shown instead of an icon when `name` isn't a recognized key - typically the category's initial. */
  fallbackLabel: string
  className?: string
}

/** A category's icon, looked up by name from a fixed set; falls back to a short text label. */
export function CategoryIcon({ name, fallbackLabel, className }: CategoryIconProps) {
  const LucideComponent = name ? CATEGORY_ICONS[name] : undefined

  if (!LucideComponent) {
    return <>{fallbackLabel}</>
  }

  return <LucideComponent className={cn(s.icon, className)} aria-hidden="true" />
}
