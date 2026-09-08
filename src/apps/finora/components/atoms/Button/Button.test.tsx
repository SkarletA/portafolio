import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children as a button with the given id', () => {
    render(<Button id="test-button">Get notified</Button>)

    const button = screen.getByRole('button', { name: 'Get notified' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('id', 'test-button')
  })
})
