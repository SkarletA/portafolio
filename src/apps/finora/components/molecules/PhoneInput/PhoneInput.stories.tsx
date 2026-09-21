import { useState } from 'react'
import { PhoneInput } from './PhoneInput'

export default {
  title: 'Finora/Molecules/PhoneInput',
  component: PhoneInput,
  parameters: {
    docs: {
      description: {
        component: 'A phone number field with a fixed, non-editable country calling-code prefix.',
      },
    },
  },
  argTypes: {
    value: {
      description: 'Digits only, no country code.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    onChange: {
      description: 'Receives the new value already stripped to digits, capped at the maximum phone length.',
      action: 'changed',
      table: { type: { summary: 'function' } },
    },
    countryCode: {
      description: 'Calling code shown as a fixed prefix, e.g. "+52"; falls back to a plain "+" when unknown.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    testId: {
      control: 'text',
      table: { type: { summary: 'string' } },
    },
  },
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
