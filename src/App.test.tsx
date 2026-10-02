import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App', () => {
  it('shows Home at /', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.queryByText('Page not found')).not.toBeInTheDocument()
  })

  it('shows NotFound for any other path', () => {
    renderAt('/does-not-exist')

    expect(screen.getByText('Page not found')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Contact' })).not.toBeInTheDocument()
  })
})
