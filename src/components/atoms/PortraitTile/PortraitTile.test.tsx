import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortraitTile } from './PortraitTile'

const defaultProps = {
  index: 0,
  symbol: 'Sk',
  name: 'Skarlet',
  alt: 'Retrato de Skarlet Araque',
  base: '/portrait',
  widths: [480, 960] as [number, number],
}

describe('PortraitTile', () => {
  it('renders the padded index, symbol, and name', () => {
    render(<PortraitTile {...defaultProps} />)

    const tile = screen.getByTestId('portrait-tile')
    expect(tile).toHaveTextContent('00')
    expect(tile).toHaveTextContent('Sk')
    expect(tile).toHaveTextContent('Skarlet')
  })

  it('renders an accessible image with width/height and lazy loading', () => {
    render(<PortraitTile {...defaultProps} />)

    const img = screen.getByAltText('Retrato de Skarlet Araque')
    expect(img).toHaveAttribute('width', '480')
    expect(img).toHaveAttribute('height', '640')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('src', '/portrait-480.webp')
    expect(img.getAttribute('srcset')).toContain('/portrait-480.webp 480w')
    expect(img.getAttribute('srcset')).toContain('/portrait-960.webp 960w')
  })
})
