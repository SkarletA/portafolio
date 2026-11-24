import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card } from './Card'

const meta: Meta<typeof Card> = {
  title: 'Portfolio/Molecules/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          'Contenedor genérico reutilizado por "Del laboratorio al código" y "Proyectos": fondo, borde, radio y color de acento vía la variable CSS --c, aplicado al borde en hover. El contenido interno (eyebrow/título/símbolo/tags) lo compone cada sección.',
      },
    },
  },
  argTypes: {
    accentColor: { control: 'color', description: 'Color de acento (borde en hover, --c para el contenido interno)' },
    href: { control: 'text', description: 'Si se da, la tarjeta completa es un <Link> interno en vez de un <div>' },
    testId: { control: 'text', table: { type: { summary: 'string' } } },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const AsDiv: Story = {
  args: {
    accentColor: '#2dd4bf',
    testId: 'story-card',
    children: (
      <>
        <p>método científico → A/B testing</p>
        <h3>Hipótesis, medición, conclusión</h3>
        <p>Antes de decidir, mido.</p>
      </>
    ),
  },
}

export const AsLink: Story = {
  args: {
    accentColor: '#ff4d5e',
    href: '/finora',
    testId: 'story-card-link',
    children: (
      <>
        <strong>Fn</strong>
        <h3>Finora</h3>
        <p>App real de finanzas personales.</p>
      </>
    ),
  },
}
