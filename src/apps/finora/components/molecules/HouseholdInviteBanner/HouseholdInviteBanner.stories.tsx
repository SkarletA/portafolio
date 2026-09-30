import { HouseholdInviteBanner } from './HouseholdInviteBanner'

export default {
  title: 'Finora/Molecules/HouseholdInviteBanner',
  component: HouseholdInviteBanner,
  parameters: {
    docs: {
      description: {
        component:
          'Shown app-wide to a user with a pending household invitation, so it appears regardless of which page they are on when it arrives.',
      },
    },
  },
  argTypes: {
    inviterName: {
      description: "The inviter's display name, or null when their profile has no name set yet.",
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    pending: {
      control: 'boolean',
      table: { type: { summary: 'boolean' } },
    },
    error: {
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
  },
}

export const Default = {
  args: {
    inviterName: 'Bel Suarez',
    pending: false,
    error: null,
  },
}

export const UnknownInviterName = {
  args: {
    inviterName: null,
    pending: false,
    error: null,
  },
}

export const Pending = {
  args: {
    inviterName: 'Bel Suarez',
    pending: true,
    error: null,
  },
}

export const WithError = {
  args: {
    inviterName: 'Bel Suarez',
    pending: false,
    error: 'That invitation no longer exists.',
  },
}
