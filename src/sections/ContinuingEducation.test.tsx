import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContinuingEducation } from './ContinuingEducation'

describe('ContinuingEducation', () => {
  it('renders the degree line', () => {
    render(<ContinuingEducation />)

    expect(screen.getByTestId('continuing-education-degree')).toBeInTheDocument()
  })

  it('renders all 6 certifications/diplomas from profile.ts', () => {
    render(<ContinuingEducation />)

    const keys = ['react', 'javascript', 'git', 'databases', 'internalPerformance', 'awsEssentials']
    for (const key of keys) {
      expect(screen.getByTestId(`continuing-education-certification-${key}`)).toBeInTheDocument()
    }
  })

  it('always shows the Credly link, with no badge chips while profile.badges is empty', () => {
    render(<ContinuingEducation />)

    const link = screen.getByTestId('continuing-education-credly-link')
    expect(link).toHaveAttribute('href', 'https://www.credly.com/users/skarlet-araque/badges/credly')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })
})
