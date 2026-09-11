import { Icon, type IconName } from './Icon'

export default {
  title: 'Finora/Atoms/Icon',
  component: Icon,
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
