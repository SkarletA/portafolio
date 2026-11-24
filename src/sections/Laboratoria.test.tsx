import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Laboratoria } from './Laboratoria'

describe('Laboratoria', () => {
  it('renders all 7 timeline steps in order', () => {
    render(<Laboratoria />)

    const steps = [
      'laboratoria-step-trivia',
      'laboratoria-step-cardValidation',
      'laboratoria-step-dataLovers',
      'laboratoria-step-socialNetwork',
      'laboratoria-step-labNotes',
      'laboratoria-step-burgerQueenClient',
      'laboratoria-step-burgerQueenApi',
    ]
    for (const testId of steps) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
  })

  it('only renders a detail line for steps that have one', () => {
    render(<Laboratoria />)

    expect(screen.getByTestId('laboratoria-step-trivia')).not.toHaveTextContent('timeline.trivia.detail')
    expect(screen.getByTestId('laboratoria-step-socialNetwork')).toHaveTextContent('timeline.socialNetwork.detail')
  })
})
