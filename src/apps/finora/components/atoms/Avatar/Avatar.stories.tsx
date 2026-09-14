import { Avatar } from './Avatar'

export default {
  title: 'Finora/Atoms/Avatar',
  component: Avatar,
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
