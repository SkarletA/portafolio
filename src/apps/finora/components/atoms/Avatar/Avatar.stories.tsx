import { Avatar } from './Avatar'

export default {
  title: 'Finora/Atoms/Avatar',
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component: 'A round profile photo, or initials on a deterministic color when no photo is set.',
      },
    },
  },
  argTypes: {
    userId: {
      description: 'Used to derive a stable fallback color when there is no photo, consistent across sessions.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    avatarUrl: {
      description: 'Uploaded profile photo; falls back to initials when absent.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    firstName: {
      description: 'Used to build the fallback initials.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    lastName: {
      description: 'Used to build the fallback initials.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    email: {
      description: 'Used for the fallback initial when no name is set.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    size: {
      description: 'Diameter of the avatar.',
      control: 'select',
      options: ['sm', 'md', 'lg'],
      table: { type: { summary: 'string' }, defaultValue: { summary: 'md' } },
    },
  },
}

export const WithImage = {
  args: {
    userId: 'u1',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
  },
}

export const InitialsFromFullName = {
  args: {
    userId: 'u1',
    firstName: 'Mariana',
    lastName: 'Ruiz',
  },
}

export const InitialsFromEmail = {
  args: {
    userId: 'u2',
    email: 'mariana@finora.app',
  },
}

export const Small = {
  args: {
    userId: 'u1',
    firstName: 'Mariana',
    lastName: 'Ruiz',
    size: 'sm',
  },
}

export const Large = {
  args: {
    userId: 'u1',
    firstName: 'Mariana',
    lastName: 'Ruiz',
    size: 'lg',
  },
}
