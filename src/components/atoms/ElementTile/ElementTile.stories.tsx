import type { Meta, StoryObj } from '@storybook/react-vite'
import { ElementTile } from './ElementTile'

const meta: Meta<typeof ElementTile> = {
  title: 'Portfolio/Atoms/ElementTile',
  component: ElementTile,
  parameters: {
    docs: {
      description: {
        component:
          'Tile estilo tabla periódica usado en "Mi tabla periódica": se voltea (click, toque, Enter/Espacio, o hover en escritorio) entre el frente (número, símbolo, nombre) y el reverso (ícono, nombre, descripción y grupo).',
      },
    },
  },
  argTypes: {
    index: { control: 'number' },
    symbol: { control: 'text' },
    name: { control: 'text' },
    accentColor: { control: 'color' },
    icon: { control: 'text' },
    blurb: { control: 'text' },
    groupLabel: { control: 'text' },
    flipLabel: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof ElementTile>

export const Front: Story = {
  args: {
    index: 1,
    symbol: 'Re',
    name: 'React',
    accentColor: '#ff4d5e',
    icon: 'react',
    blurb: 'Flujo de compra: colecciones, página de producto y carrito.',
    groupLabel: 'Frontend',
    flipLabel: 'Voltear tarjeta de React',
  },
}

export const Flipped: Story = {
  args: {
    ...Front.args,
    symbol: 'Su',
    name: 'Supabase',
    accentColor: '#60a5fa',
    icon: 'supabase',
    blurb: 'Backend como servicio para proyectos propios.',
    groupLabel: 'Datos / búsqueda',
    flipLabel: 'Voltear tarjeta de Supabase',
    defaultFlipped: true,
  },
}

export const MissingIcon: Story = {
  args: {
    index: 13,
    symbol: 'Ek',
    name: 'AWS / EKS',
    accentColor: '#fbbf24',
    icon: null,
    blurb: 'Infraestructura donde corre el flujo de compra migrado.',
    groupLabel: 'Infraestructura',
    flipLabel: 'Voltear tarjeta de AWS / EKS',
    defaultFlipped: true,
  },
}
