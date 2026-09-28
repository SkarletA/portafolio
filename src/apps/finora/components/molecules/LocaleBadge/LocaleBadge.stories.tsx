import { LocaleBadge } from './LocaleBadge'

export default {
  title: 'Finora/Molecules/LocaleBadge',
  component: LocaleBadge,
  parameters: {
    docs: {
      description: {
        component:
          "The current language and currency, linking to Settings to change them. Reads useLanguage/useCurrency directly, so it takes no props - the global decorator's providers (.storybook/preview.tsx) supply their default English/USD state.",
      },
    },
  },
}

export const Default = {}
