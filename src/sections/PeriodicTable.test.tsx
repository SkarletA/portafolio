import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { profile } from '@portfolio-data/profile'
import { PeriodicTable } from './PeriodicTable'

describe('PeriodicTable', () => {
  it('renders all 15 elements from profile.elements', () => {
    render(<PeriodicTable />)

    for (const element of profile.elements) {
      expect(screen.getByTestId(`element-tile-${element.symbol.toLowerCase()}`)).toBeInTheDocument()
    }
  })
})
