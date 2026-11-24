import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ElementTile } from './ElementTile'

describe('ElementTile', () => {
  it('renders the index, symbol, and name', () => {
    render(<ElementTile index={1} symbol="Re" name="React" accentColor="#ff4d5e" />)

    const tile = screen.getByTestId('element-tile-re')
    expect(tile).toHaveTextContent('01')
    expect(tile).toHaveTextContent('Re')
    expect(tile).toHaveTextContent('React')
  })

  it('pads the index to 2 digits', () => {
    render(<ElementTile index={9} symbol="Vc" name="Vercel" accentColor="#fbbf24" />)

    expect(screen.getByTestId('element-tile-vc')).toHaveTextContent('09')
  })
})
