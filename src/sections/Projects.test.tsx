import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { Projects } from './Projects'

function renderProjects() {
  return render(
    <MemoryRouter>
      <Projects />
    </MemoryRouter>
  )
}

describe('Projects', () => {
  it('renders the 3 cards: Finora, Salsas Tovar, Ben & Frank', () => {
    renderProjects()

    expect(screen.getByTestId('projects-finora-card')).toBeInTheDocument()
    expect(screen.getByTestId('projects-salsas-tovar-card')).toBeInTheDocument()
    expect(screen.getByTestId('projects-ben-and-frank-card')).toBeInTheDocument()
  })

  it('only the Finora card links to /finora', () => {
    renderProjects()

    expect(screen.getByTestId('projects-finora-card')).toHaveAttribute('href', '/finora')
    expect(screen.getByTestId('projects-salsas-tovar-card').tagName).toBe('DIV')
    expect(screen.getByTestId('projects-ben-and-frank-card').tagName).toBe('DIV')
  })

  it("renders Ben & Frank's name and translated subtitle/tags", () => {
    renderProjects()

    const card = screen.getByTestId('projects-ben-and-frank-card')
    expect(card).toHaveTextContent('Ben & Frank')
    expect(card).toHaveTextContent('cards.benAndFrank.subtitle')
    expect(card).toHaveTextContent('tags.awsEks')
  })
})
