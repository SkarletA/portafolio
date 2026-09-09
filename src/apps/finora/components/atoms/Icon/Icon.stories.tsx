import { Icon, type IconName } from './Icon'

export default {
  title: 'Finora/Atoms/Icon',
  component: Icon,
}

export const Utensils = {
  args: { name: 'utensils' },
}

export const Home = {
  args: { name: 'home' },
}

export const Car = {
  args: { name: 'car' },
}

export const ShoppingBag = {
  args: { name: 'shopping-bag' },
}

export const Tv = {
  args: { name: 'tv' },
}

const ALL_ICON_NAMES: IconName[] = ['utensils', 'home', 'car', 'shopping-bag', 'tv']

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
