import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders the image when an avatarUrl is provided', () => {
    render(<Avatar userId="u1" avatarUrl="https://example.com/avatar.png" firstName="Mariana" />)

    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  it('falls back to first and last name initials when there is no avatar', () => {
    render(<Avatar userId="u1" firstName="Mariana" lastName="Ruiz" />)

    expect(screen.getByText('MR')).toBeInTheDocument()
  })

  it('falls back to the first name initial alone when there is no last name', () => {
    render(<Avatar userId="u1" firstName="Mariana" />)

    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('falls back to the email initial when there is no name', () => {
    render(<Avatar userId="u1" email="mariana@finora.app" />)

    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('falls back to a question mark when there is no name or email', () => {
    render(<Avatar userId="u1" />)

    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('assigns the same fallback color to the same userId across renders', () => {
    const { container: first } = render(<Avatar userId="same-user" firstName="A" />)
    const { container: second } = render(<Avatar userId="same-user" firstName="A" />)

    expect(first.firstElementChild?.className).toBe(second.firstElementChild?.className)
  })

  it('can assign different fallback colors to different userIds', () => {
    const { container: first } = render(<Avatar userId="user-one" firstName="A" />)
    const { container: second } = render(<Avatar userId="user-two" firstName="A" />)

    expect(first.firstElementChild?.className).not.toBe(second.firstElementChild?.className)
  })
})
