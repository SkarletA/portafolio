import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LabAnalogies } from './LabAnalogies'

describe('LabAnalogies', () => {
  it('renders the three analogy cards', () => {
    render(
      <MemoryRouter>
        <LabAnalogies />
      </MemoryRouter>
    )

    expect(screen.getByTestId('lab-analogy-method-card')).toBeInTheDocument()
    expect(screen.getByTestId('lab-analogy-equations-card')).toBeInTheDocument()
    expect(screen.getByTestId('lab-analogy-catalysts-card')).toBeInTheDocument()
  })

  it('renders each card title and description through the translation keys', () => {
    render(
      <MemoryRouter>
        <LabAnalogies />
      </MemoryRouter>
    )

    expect(screen.getByText('items.method.title')).toBeInTheDocument()
    expect(screen.getByText('items.method.description')).toBeInTheDocument()
  })
})
