import { Button } from './Button'

export default {
  title: 'Finora/Atoms/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A clickable action button, in Finora’s primary (filled) or secondary (outlined) style.',
      },
    },
  },
  argTypes: {
    id: {
      description: 'Unique DOM id, required so every button can be addressed individually.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    children: {
      description: 'Button label/content.',
      control: 'text',
      table: { type: { summary: 'ReactNode' } },
    },
    variant: {
      description: 'The main call to action on a screen (`primary`) or a lower-emphasis action (`secondary`).',
      control: 'select',
      options: ['primary', 'secondary'],
      table: { type: { summary: 'string' }, defaultValue: { summary: 'primary' } },
    },
    disabled: {
      description: 'Disables the button and blocks user interaction.',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onClick: {
      description: 'Called when the user clicks the button.',
      action: 'clicked',
      table: { type: { summary: 'function' } },
    },
  },
}

export const Primary = {
  args: { id: 'story-button-primary', children: 'Get notified', variant: 'primary' },
}

export const Secondary = {
  args: { id: 'story-button-secondary', children: 'Learn more', variant: 'secondary' },
}

export const Disabled = {
  args: { id: 'story-button-disabled', children: 'Save changes', variant: 'primary', disabled: true },
}
