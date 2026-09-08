import { Badge } from './Badge'

export default {
  title: 'Finora/Atoms/Badge',
  component: Badge,
}

export const Success = {
  args: { children: 'Completed', variant: 'success' },
}

export const Neutral = {
  args: { children: 'Pending', variant: 'neutral' },
}
