import { useState } from 'react'
import { PasswordInput } from './PasswordInput'

export default {
  title: 'Finora/Molecules/PasswordInput',
  component: PasswordInput,
  parameters: {
    docs: {
      description: { component: 'A password field with a show/hide toggle.' },
    },
  },
  argTypes: {
    label: {
      description: 'Field label.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    value: {
      description: 'The current password value.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    onChange: {
      description: 'Called on every keystroke with the raw input change event.',
      action: 'changed',
      table: { type: { summary: 'function' } },
    },
    testId: {
      description: 'Base id for this field’s own testid and its visibility-toggle button’s testid.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    required: {
      description: 'Marks the field as required.',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
  },
}

function Template() {
  const [value, setValue] = useState('')

  return (
    <PasswordInput
      label="Password"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      testId="story-password-input"
    />
  )
}

export const Default = {
  render: Template,
}
