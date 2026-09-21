import { useState } from 'react'
import { Select } from './Select'

export default {
  title: 'Finora/Atoms/Select',
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          "A dropdown list of options to choose one from, styled to match the rest of Finora's inputs and legible in both light and dark mode - unlike a native `<select>`, whose option list the browser paints with the OS palette regardless of page theme. Supports arrow-key navigation, Enter to select, and Escape to close.",
      },
    },
  },
  argTypes: {
    options: {
      description: 'The list of choices, each with a value, a label, and an optional disabled flag.',
      control: false,
      table: { type: { summary: 'SelectOption[]' } },
    },
    value: {
      description: "The currently selected option's value, or `''` for no selection.",
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    onChange: {
      description: 'Called with the newly selected value.',
      action: 'changed',
      table: { type: { summary: 'function' } },
    },
    placeholder: {
      description: 'Shown in place of a label when nothing is selected yet.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      description: 'Disables the trigger and blocks opening the panel.',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    testId: {
      description: 'Base for this instance’s `data-testid`s: `{testId}-trigger` and `{testId}-option-{value}`.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
  },
}

const OPTIONS = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'entertainment', label: 'Entertainment', disabled: true },
]

function Template() {
  const [value, setValue] = useState('')

  return (
    <Select
      options={OPTIONS}
      value={value}
      onChange={setValue}
      placeholder="Select a category"
      testId="story-select"
    />
  )
}

export const Default = {
  render: Template,
}

export const Disabled = {
  args: {
    options: OPTIONS,
    value: 'food',
    onChange: () => {},
    testId: 'story-select-disabled',
    disabled: true,
  },
}
