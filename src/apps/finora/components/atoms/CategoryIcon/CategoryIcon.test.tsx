import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CategoryIcon, CATEGORY_ICON_NAMES, DEFAULT_CATEGORY_ICON } from './CategoryIcon'

describe('CategoryIcon', () => {
  it('renders a lucide icon for a known category icon name', () => {
    const { container } = render(<CategoryIcon name="beef" fallbackLabel="C" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(screen.queryByText('C')).not.toBeInTheDocument()
  })

  it('falls back to the provided label for an unrecognized icon name', () => {
    render(<CategoryIcon name="not-a-real-icon" fallbackLabel="C" />)

    expect(screen.getByText('C')).toBeInTheDocument()
  })

  it('falls back to the provided label when there is no icon name', () => {
    render(<CategoryIcon name={null} fallbackLabel="F" />)

    expect(screen.getByText('F')).toBeInTheDocument()
  })

  it('exposes every seeded category icon name used in the database', () => {
    expect(CATEGORY_ICON_NAMES).toEqual(
      expect.arrayContaining(['utensils', 'beef', 'shopping-cart', 'home', 'car', 'shopping-bag', 'tv'])
    )
  })

  it('exposes a default icon that is itself a known, renderable icon name', () => {
    expect(CATEGORY_ICON_NAMES).toContain(DEFAULT_CATEGORY_ICON)
  })
})
