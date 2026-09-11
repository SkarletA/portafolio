import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, type IconName } from './Icon'

const ICON_NAMES: IconName[] = [
  'brand-mark',
  'dashboard',
  'transactions',
  'budgets',
  'analytics',
  'goals',
  'settings',
  'plus',
  'search',
  'edit',
  'trash',
]

describe('Icon', () => {
  it.each(ICON_NAMES)('renders an svg for "%s"', (name) => {
    const { container } = render(<Icon name={name} />)

    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
