import { PasswordStrengthHint } from './PasswordStrengthHint'

export default {
  title: 'Finora/Molecules/PasswordStrengthHint',
  component: PasswordStrengthHint,
  parameters: {
    docs: {
      description: {
        component: 'A checklist of password requirements, each marked met or unmet as the user types.',
      },
    },
  },
  argTypes: {
    password: {
      description: 'The password to check against each requirement as the user types.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
  },
}

export const Empty = {
  args: { password: '' },
}

export const Partial = {
  args: { password: 'lowercase1' },
}

export const Valid = {
  args: { password: 'Passw0rd!' },
}
