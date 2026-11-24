import type { Meta, StoryObj } from '@storybook/react-vite'
import { PortraitTile } from './PortraitTile'

const meta: Meta<typeof PortraitTile> = {
  title: 'Portfolio/Atoms/PortraitTile',
  component: PortraitTile,
  parameters: {
    docs: {
      description: {
        component:
          'A photo framed as a periodic-table tile (index, symbol and name over a gradient scrim), used in "Del laboratorio al código". WebP in two widths via srcset.',
      },
    },
  },
  argTypes: {
    index: { control: 'number' },
    symbol: { control: 'text' },
    name: { control: 'text' },
    alt: { control: 'text' },
    base: { control: 'text' },
    focalPosition: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof PortraitTile>

export const Default: Story = {
  args: {
    index: 0,
    symbol: 'Sk',
    name: 'Skarlet',
    alt: 'Retrato de Skarlet Araque',
    base: '/portrait',
    widths: [480, 960],
  },
}

export const AdjustedFocalPosition: Story = {
  args: {
    ...Default.args,
    focalPosition: 'center 30%',
  },
}
