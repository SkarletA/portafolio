import { AsyncState } from './AsyncState'

export default {
  title: 'Finora/Molecules/AsyncState',
  component: AsyncState,
  parameters: {
    docs: {
      description: {
        component: 'Swaps between a loading skeleton, an error message, an empty-state message, and the real content.',
      },
    },
  },
  argTypes: {
    loading: {
      description: 'Shows the skeleton placeholders while true.',
      control: 'boolean',
      table: { type: { summary: 'boolean' } },
    },
    error: {
      description: 'A message to show instead of the content; `null` means no error.',
      control: 'text',
      table: { type: { summary: 'string | null' } },
    },
    isEmpty: {
      description: 'Whether the loaded data has nothing to show.',
      control: 'boolean',
      table: { type: { summary: 'boolean' } },
    },
    loadingLabel: {
      description: 'Announced to screen readers while loading.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    errorMessage: {
      description: 'Shown when `error` is set.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    emptyMessage: {
      description: 'Shown when `isEmpty` is true.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    skeletonCount: {
      description: 'How many skeleton placeholders to render while loading.',
      control: 'number',
      table: { type: { summary: 'number' } },
    },
    skeletonWrapClassName: {
      description: 'Class for the element wrapping all the skeleton placeholders.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    skeletonItemClassName: {
      description: 'Class for each individual skeleton placeholder.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    boxed: {
      description: 'Adds a bordered card look around the error/empty message.',
      control: 'boolean',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    children: {
      description: 'The real content, rendered once loading has finished without error and there is data to show.',
      control: false,
      table: { type: { summary: 'ReactNode' } },
    },
  },
}

const commonProps = {
  loadingLabel: 'Loading items…',
  errorMessage: "We couldn't load your items. Please try again later.",
  emptyMessage: "You don't have any items yet.",
  skeletonCount: 3,
  skeletonWrapClassName: 'flex flex-col gap-3',
  skeletonItemClassName: 'h-12 animate-pulse rounded-lg bg-slate-100',
}

export const Loading = {
  args: {
    ...commonProps,
    loading: true,
    error: null,
    isEmpty: false,
    children: <p>Loaded content</p>,
  },
}

export const ErrorState = {
  args: {
    ...commonProps,
    loading: false,
    error: 'Network error',
    isEmpty: false,
    children: <p>Loaded content</p>,
  },
}

export const Empty = {
  args: {
    ...commonProps,
    loading: false,
    error: null,
    isEmpty: true,
    children: <p>Loaded content</p>,
  },
}

export const Boxed = {
  args: {
    ...commonProps,
    loading: false,
    error: null,
    isEmpty: true,
    boxed: true,
    children: <p>Loaded content</p>,
  },
}

export const Loaded = {
  args: {
    ...commonProps,
    loading: false,
    error: null,
    isEmpty: false,
    children: <p>Loaded content</p>,
  },
}
