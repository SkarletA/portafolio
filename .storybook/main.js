/** @type {import('@storybook/react-vite').StorybookConfig} */
const config = {
  stories: ['../src/apps/finora/**/*.mdx', '../src/apps/finora/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
}

export default config
