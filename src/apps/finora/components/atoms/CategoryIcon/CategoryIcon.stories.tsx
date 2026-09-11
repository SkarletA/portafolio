import { CategoryIcon } from './CategoryIcon'

export default {
  title: 'Finora/Atoms/CategoryIcon',
  component: CategoryIcon,
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
