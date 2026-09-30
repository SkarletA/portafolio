import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HouseholdInviteBanner } from './HouseholdInviteBanner'

describe('HouseholdInviteBanner', () => {
  it('shows the inviter name when known', () => {
    render(<HouseholdInviteBanner inviterName="Bel" onAccept={vi.fn()} onDecline={vi.fn()} pending={false} error={null} />)

    expect(screen.getByText('banner.invitedBy:{"name":"Bel"}')).toBeInTheDocument()
  })

  it('falls back to a generic message when the inviter has no name set', () => {
    render(<HouseholdInviteBanner inviterName={null} onAccept={vi.fn()} onDecline={vi.fn()} pending={false} error={null} />)

    expect(screen.getByText('banner.invitedByUnknown')).toBeInTheDocument()
  })

  it('calls onAccept and onDecline when their buttons are clicked', () => {
    const onAccept = vi.fn()
    const onDecline = vi.fn()
    render(<HouseholdInviteBanner inviterName="Bel" onAccept={onAccept} onDecline={onDecline} pending={false} error={null} />)

    fireEvent.click(screen.getByTestId('household-invite-banner-accept-button'))
    fireEvent.click(screen.getByTestId('household-invite-banner-decline-button'))

    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('disables both actions while a response is pending', () => {
    render(<HouseholdInviteBanner inviterName="Bel" onAccept={vi.fn()} onDecline={vi.fn()} pending error={null} />)

    expect(screen.getByTestId('household-invite-banner-accept-button')).toBeDisabled()
    expect(screen.getByTestId('household-invite-banner-decline-button')).toBeDisabled()
  })

  it('shows an error message when given one', () => {
    render(
      <HouseholdInviteBanner inviterName="Bel" onAccept={vi.fn()} onDecline={vi.fn()} pending={false} error="Something went wrong." />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.')
  })
})
