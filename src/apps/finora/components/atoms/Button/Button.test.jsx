import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children as a button', () => {
    render(<Button>Get notified</Button>)

    expect(screen.getByRole('button', { name: 'Get notified' })).toBeInTheDocument()
  })
})
