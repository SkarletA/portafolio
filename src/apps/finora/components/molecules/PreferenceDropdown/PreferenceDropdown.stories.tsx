import { Icon } from '@atoms/Icon/Icon'
import { PreferenceDropdown } from './PreferenceDropdown'

export default {
  title: 'Finora/Molecules/PreferenceDropdown',
  component: PreferenceDropdown,
  parameters: {
    docs: {
      description: {
        component: 'A labeled dropdown for a user preference (language, currency), used in the side navigation and Settings.',
      },
    },
  },
  argTypes: {
    icon: {
      description: 'Icon shown next to the label.',
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
    label: {
      description: "The preference's name.",
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    value: {
      description: 'The currently selected value.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    options: {
      description: 'The choices offered.',
      control: false,
      table: { type: { summary: 'PreferenceDropdownOption[]' } },
    },
    onSelect: {
      description: 'Called with the chosen value.',
      action: 'select',
      table: { type: { summary: 'function' } },
    },
  },
}

export const Language = {
  args: {
    icon: <Icon name="language" className="h-[18px] w-[18px]" />,
    label: 'Language',
    value: 'en',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' },
    ],
    onSelect: () => {},
    testId: 'sidebar-language',
  },
}

export const Currency = {
  args: {
    icon: <Icon name="currency" className="h-[18px] w-[18px]" />,
    label: 'Currency',
    value: 'USD',
    options: [
      { value: 'USD', label: 'USD' },
      { value: 'MXN', label: 'MXN' },
      { value: 'EUR', label: 'EUR' },
    ],
    onSelect: () => {},
    testId: 'sidebar-currency',
  },
}
