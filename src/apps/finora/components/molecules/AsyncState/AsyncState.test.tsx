import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AsyncState } from './AsyncState'

const commonProps = {
  loadingLabel: 'Loading items…',
  errorMessage: "We couldn't load your items. Please try again later.",
  emptyMessage: "You don't have any items yet.",
  skeletonCount: 3,
  skeletonWrapClassName: 'wrap-class',
  skeletonItemClassName: 'item-class',
}

describe('AsyncState', () => {
  it('renders a skeleton with the loading label and the requested number of placeholders while loading', () => {
    render(
      <AsyncState {...commonProps} loading error={null} isEmpty={false}>
        <p>Loaded content</p>
      </AsyncState>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading items…')).toBeInTheDocument()
    expect(screen.queryByText('Loaded content')).not.toBeInTheDocument()
  })

  it('renders the error message and not the children when there is an error', () => {
    render(
      <AsyncState {...commonProps} loading={false} error="Network error" isEmpty={false}>
        <p>Loaded content</p>
      </AsyncState>
    )

    expect(screen.getByText(commonProps.errorMessage)).toBeInTheDocument()
    expect(screen.queryByText('Loaded content')).not.toBeInTheDocument()
  })

  it('renders the empty message and not the children when there is no data', () => {
    render(
      <AsyncState {...commonProps} loading={false} error={null} isEmpty>
        <p>Loaded content</p>
      </AsyncState>
    )

    expect(screen.getByText(commonProps.emptyMessage)).toBeInTheDocument()
    expect(screen.queryByText('Loaded content')).not.toBeInTheDocument()
  })

  it('renders the children once loaded, with no error, and not empty', () => {
    render(
      <AsyncState {...commonProps} loading={false} error={null} isEmpty={false}>
        <p>Loaded content</p>
      </AsyncState>
    )

    expect(screen.getByText('Loaded content')).toBeInTheDocument()
  })
})
