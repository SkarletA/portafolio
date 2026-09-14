import { useState } from 'react'
import { PhoneInput } from './PhoneInput'

export default {
  title: 'Finora/Molecules/PhoneInput',
  component: PhoneInput,
}

function Template({ countryCode }: { countryCode?: string }) {
  const [value, setValue] = useState('')

  return <PhoneInput value={value} onChange={setValue} countryCode={countryCode} testId="story-phone-input" />
}

export const NoCountrySelected = {
  render: () => <Template />,
}

export const WithCountryCode = {
  render: () => <Template countryCode="+52" />,
}
