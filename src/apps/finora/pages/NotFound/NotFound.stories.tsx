import { NotFound } from './NotFound'

export default {
  title: 'Finora/Pages/NotFound',
  component: NotFound,
  parameters: {
    docs: {
      description: {
        component: 'Shown for any /finora/* route that does not match - stays inside AppShell, public (no auth required).',
      },
    },
  },
}

export const Default = {}
