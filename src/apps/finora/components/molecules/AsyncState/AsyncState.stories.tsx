import { AsyncState } from './AsyncState'

export default {
  title: 'Finora/Molecules/AsyncState',
  component: AsyncState,
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
