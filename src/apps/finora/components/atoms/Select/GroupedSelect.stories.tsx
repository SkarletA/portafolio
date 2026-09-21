import { useState } from 'react'
import { GroupedSelect } from './GroupedSelect'

export default {
  title: 'Finora/Atoms/GroupedSelect',
  component: GroupedSelect,
  parameters: {
    docs: {
      description: {
        component:
          'A dropdown list of options organized into labeled groups, with each group’s own value directly selectable alongside its indented children - e.g. picking "Food" itself or one of its subcategories like "Food > Meat" from the same list. Otherwise the same as Select: legible in both themes, with arrow-key navigation, Enter to select, and Escape to close.',
      },
    },
  },
  argTypes: {
    groups: {
      description: "Each group's own selectable value/label plus its indented children; a group with no children just has nothing indented under its header.",
      control: false,
      table: { type: { summary: 'GroupedSelectGroup[]' } },
    },
    value: {
      description: "The currently selected value (a group's own value or one of its children's), or `''` for no selection.",
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
    specialOption: {
      description: 'Rendered at the end of the panel, below a separator with a "+" icon - e.g. "Create new category".',
      control: false,
      table: { type: { summary: 'GroupedSelectSpecialOption' } },
    },
  },
}

const GROUPS = [
  {
    value: 'food',
    label: 'Food',
    children: [
      { value: 'meat', label: 'Meat' },
      { value: 'groceries', label: 'Groceries' },
    ],
  },
  {
    value: 'housing',
    label: 'Housing',
    children: [],
  },
  {
    value: 'transport',
    label: 'Transport',
    children: [{ value: 'fuel', label: 'Fuel' }],
  },
]

function Template() {
  const [value, setValue] = useState('')

  return (
    <GroupedSelect
      groups={GROUPS}
      value={value}
      onChange={setValue}
      placeholder="Select a category"
      testId="story-grouped-select"
      specialOption={{ value: '__create__', label: 'Create new category' }}
    />
  )
}

export const Default = {
  render: Template,
}
