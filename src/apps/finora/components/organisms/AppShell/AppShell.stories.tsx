import { AppShell } from './AppShell'

export default {
  title: 'Finora/Organisms/AppShell',
  component: AppShell,
  parameters: {
    docs: {
      description: {
        component:
          'The app-wide frame around every Finora page: desktop sidebar or mobile header/tab bar, and the page content between them.',
      },
    },
  },
  argTypes: {
    children: {
      description: "The current page's content, rendered inside the shell's main content area.",
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
  },
}

export const Default = {
  args: {
    children: <p className="px-6 py-10">Page content</p>,
  },
}
