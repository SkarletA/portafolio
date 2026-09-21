import { CategoryIcon } from './CategoryIcon'

export default {
  title: 'Finora/Atoms/CategoryIcon',
  component: CategoryIcon,
  parameters: {
    docs: {
      description: {
        component: "A category's icon, looked up by name from a fixed set; falls back to a short text label.",
      },
    },
  },
  argTypes: {
    name: {
      description: 'One of the known icon keys (see CATEGORY_ICON_NAMES); unknown or null falls back to text.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    fallbackLabel: {
      description: "Shown instead of an icon when `name` isn't a recognized key - typically the category's initial.",
      control: 'text',
      table: { type: { summary: 'string' } },
    },
  },
}

export const Known = {
  args: {
    name: 'beef',
    fallbackLabel: 'C',
  },
}

export const Unknown = {
  args: {
    name: 'not-a-real-icon',
    fallbackLabel: 'C',
  },
}

export const NoIcon = {
  args: {
    name: null,
    fallbackLabel: 'F',
  },
}
