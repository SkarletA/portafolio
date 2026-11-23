import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MoleculeHero } from './MoleculeHero'

describe('MoleculeHero', () => {
  it('exposes an accessible name for the whole widget', () => {
    render(<MoleculeHero />)

    expect(screen.getByRole('img', { name: /molécula 3d interactiva/i })).toBeInTheDocument()
  })

  it('renders the static fallback and no canvas/tooltip when WebGL is unavailable (jsdom has no WebGL)', () => {
    const { container } = render(<MoleculeHero />)

    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('hero-molecule-tooltip')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('toggles state label and button copy when the morph button is activated', () => {
    render(<MoleculeHero />)

    expect(screen.getByTestId('hero-molecule-state-label')).toHaveTextContent('molécula')
    const button = screen.getByTestId('hero-molecule-morph-button')
    expect(button.tagName).toBe('BUTTON')

    fireEvent.click(button)

    expect(screen.getByTestId('hero-molecule-state-label')).toHaveTextContent('árbol de componentes')
    expect(button).toHaveTextContent('Volver a molécula')

    fireEvent.click(button)

    expect(screen.getByTestId('hero-molecule-state-label')).toHaveTextContent('molécula')
  })

  it('is a real button, operable from the keyboard without extra wiring', () => {
    render(<MoleculeHero />)

    const button = screen.getByTestId('hero-molecule-morph-button')
    button.focus()
    expect(button).toHaveFocus()

    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
    fireEvent.click(button)

    expect(screen.getByTestId('hero-molecule-state-label')).toHaveTextContent('árbol de componentes')
  })
})
