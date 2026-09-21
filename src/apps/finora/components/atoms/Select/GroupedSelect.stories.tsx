import { useState } from 'react'
import { GroupedSelect } from './GroupedSelect'

export default {
  title: 'Finora/Atoms/GroupedSelect',
  component: GroupedSelect,
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
