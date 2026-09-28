import { Register } from './Register'

export default {
  title: 'Finora/Pages/Register',
  component: Register,
  parameters: {
    docs: {
      description: {
        component:
          'The account creation form. Takes no props - reads useAuth() for the submit action only, with no data fetched on mount, so this shows the initial form as-is. The confirmation-sent state is reached only after a real signUp() call, so it is not shown here (would need mocking the auth service).',
      },
    },
  },
}

export const Default = {}
