import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ElementTile } from './ElementTile'

const defaultProps = {
  index: 1,
  symbol: 'Re',
  name: 'React',
  accentColor: '#ff4d5e',
  icon: 'react',
  blurb: 'Component UI across the checkout flow.',
  groupLabel: 'Frontend',
  flipLabel: 'Flip React card',
}

describe('ElementTile', () => {
  it('renders the index, symbol, and name on the front face', () => {
    render(<ElementTile {...defaultProps} />)

    const tile = screen.getByTestId('element-tile-re')
    expect(tile).toHaveTextContent('01')
    expect(tile).toHaveTextContent('Re')
    expect(tile).toHaveTextContent('React')
  })

  it('pads the index to 2 digits', () => {
    render(<ElementTile {...defaultProps} index={9} symbol="Vc" name="Vercel" icon="vercel" />)

    expect(screen.getByTestId('element-tile-vc')).toHaveTextContent('09')
  })

  it('is a real button, starts unflipped, and flips on click', () => {
    render(<ElementTile {...defaultProps} />)

    const tile = screen.getByTestId('element-tile-re')
    expect(tile.tagName).toBe('BUTTON')
    expect(tile).toHaveAttribute('aria-pressed', 'false')
    expect(tile).toHaveAttribute('aria-label', 'Flip React card')
    expect(tile).toHaveTextContent(defaultProps.blurb)

    fireEvent.click(tile)

    expect(tile).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(tile)

    expect(tile).toHaveAttribute('aria-pressed', 'false')
  })

  it('flips with the keyboard (Enter/Space activate a native button)', () => {
    render(<ElementTile {...defaultProps} />)

    const tile = screen.getByTestId('element-tile-re')
    tile.focus()
    expect(tile).toHaveFocus()

    fireEvent.click(tile)

    expect(tile).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the inactive face from assistive tech and shows the active one', () => {
    render(<ElementTile {...defaultProps} />)

    const tile = screen.getByTestId('element-tile-re')
    const [front, back] = tile.querySelectorAll('[aria-hidden]')
    expect(front).toHaveAttribute('aria-hidden', 'false')
    expect(back).toHaveAttribute('aria-hidden', 'true')

    fireEvent.click(tile)

    expect(front).toHaveAttribute('aria-hidden', 'true')
    expect(back).toHaveAttribute('aria-hidden', 'false')
  })

  it('falls back to a symbol monogram when there is no icon for the brand', () => {
    render(<ElementTile {...defaultProps} symbol="Ek" name="AWS / EKS" icon={null} />)

    expect(screen.getByText('Ek', { selector: 'span' })).toBeInTheDocument()
  })
})
