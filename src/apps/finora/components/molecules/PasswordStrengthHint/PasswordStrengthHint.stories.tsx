import { PasswordStrengthHint } from './PasswordStrengthHint'

export default {
  title: 'Finora/Molecules/PasswordStrengthHint',
  component: PasswordStrengthHint,
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
