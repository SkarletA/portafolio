import { BottomSheet } from './BottomSheet'

export default {
  title: 'Finora/Atoms/BottomSheet',
  component: BottomSheet,
  parameters: {
    docs: {
      description: {
        component:
          'A modal sheet anchored to the bottom of the viewport. Closes on Escape or a click on the backdrop, traps Tab inside the panel, and returns focus to whatever opened it once closed.',
      },
    },
  },
  argTypes: {
    open: {
      description: 'Whether the sheet is shown.',
      control: 'boolean',
      table: { type: { summary: 'boolean' } },
    },
    onClose: {
      description: 'Called on Escape, a backdrop click, or when Tab would move focus outside the panel.',
      action: 'close',
      table: { type: { summary: 'function' } },
    },
    ariaLabel: {
      description: "The dialog's accessible name; there is no visible title row.",
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    children: {
      description: 'The panel content.',
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
  },
}

export const Open = {
  args: {
    open: true,
    onClose: () => {},
    ariaLabel: 'More options',
    testId: 'story-bottom-sheet',
    children: <p className="px-2 py-4 text-sm">Sheet content</p>,
  },
}

export const Closed = {
  args: {
    open: false,
    onClose: () => {},
    ariaLabel: 'More options',
    testId: 'story-bottom-sheet',
    children: <p className="px-2 py-4 text-sm">Sheet content</p>,
  },
}
