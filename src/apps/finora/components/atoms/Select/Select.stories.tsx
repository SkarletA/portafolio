import { useState } from 'react'
import { Select } from './Select'

export default {
  title: 'Finora/Atoms/Select',
  component: Select,
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
