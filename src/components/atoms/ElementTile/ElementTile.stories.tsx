import type { Meta, StoryObj } from '@storybook/react-vite'
import { ElementTile } from './ElementTile'

const meta: Meta<typeof ElementTile> = {
  title: 'Portfolio/Atoms/ElementTile',
  component: ElementTile,
  parameters: {
    docs: {
      description: {
        component: 'Tile estilo tabla periódica usado en "Mi tabla periódica": número, símbolo, nombre y borde de color por grupo.',
      },
    },
  },
  argTypes: {
    index: { control: 'number' },
    symbol: { control: 'text' },
    name: { control: 'text' },
    accentColor: { control: 'color' },
  },
}

export default meta
type Story = StoryObj<typeof ElementTile>

export const React: Story = {
  args: { index: 1, symbol: 'Re', name: 'React', accentColor: '#ff4d5e' },
}

export const Supabase: Story = {
  args: { index: 7, symbol: 'Su', name: 'Supabase', accentColor: '#60a5fa' },
}
