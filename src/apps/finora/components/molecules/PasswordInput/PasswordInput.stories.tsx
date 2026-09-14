import { useState } from 'react'
import { PasswordInput } from './PasswordInput'

export default {
  title: 'Finora/Molecules/PasswordInput',
  component: PasswordInput,
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
