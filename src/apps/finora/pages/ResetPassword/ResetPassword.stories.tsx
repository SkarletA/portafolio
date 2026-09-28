import { ResetPassword } from './ResetPassword'

export default {
  title: 'Finora/Pages/ResetPassword',
  component: ResetPassword,
  parameters: {
    docs: {
      description: {
        component:
          'The new-password form reached from the reset email link. Takes no props - reads useAuth() for the submit action only, with no data fetched on mount, so this shows the initial form as-is. The success state is reached only after a real updatePassword() call, so it is not shown here (would need mocking the auth service).',
      },
    },
  },
}

export const Default = {}
