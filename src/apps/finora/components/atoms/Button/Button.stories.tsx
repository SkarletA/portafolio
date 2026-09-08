import { Button } from './Button'

export default {
  title: 'Finora/Atoms/Button',
  component: Button,
}

export const Primary = {
  args: { id: 'story-button-primary', children: 'Get notified', variant: 'primary' },
}

export const Secondary = {
  args: { id: 'story-button-secondary', children: 'Learn more', variant: 'secondary' },
}
