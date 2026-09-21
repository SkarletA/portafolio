import { Icon, type IconName } from './Icon'

export default {
  title: 'Finora/Atoms/Icon',
  component: Icon,
  args: { className: 'h-6 w-6' },
  parameters: {
    docs: {
      description: {
        component: "A hand-drawn line icon from Finora's own glyph set, sized and colored via `className`.",
      },
    },
  },
  argTypes: {
    name: {
      description: 'Which glyph to render.',
      control: 'select',
      options: [
        'brand-mark',
        'dashboard',
        'transactions',
        'budgets',
        'analytics',
        'goals',
        'settings',
        'plus',
        'search',
        'edit',
        'trash',
        'language',
        'currency',
      ],
      table: { type: { summary: 'IconName' } },
    },
    className: {
      description: "Extra classes, typically to set the icon's size and color.",
      control: 'text',
      table: { type: { summary: 'string' } },
    },
  },
}

export const Dashboard = {
  args: { name: 'dashboard' },
}

export const Edit = {
  args: { name: 'edit' },
}

export const Trash = {
  args: { name: 'trash' },
}

const ALL_ICON_NAMES: IconName[] = [
  'brand-mark',
  'dashboard',
  'transactions',
  'budgets',
  'analytics',
  'goals',
  'settings',
  'plus',
  'search',
  'edit',
  'trash',
]

export const AllIcons = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
      {ALL_ICON_NAMES.map((name) => (
        <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <Icon name={name} className="h-6 w-6" />
          <span style={{ fontSize: '12px' }}>{name}</span>
        </div>
      ))}
    </div>
  ),
}
