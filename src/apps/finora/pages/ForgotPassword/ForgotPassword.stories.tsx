import { ForgotPassword } from './ForgotPassword'

export default {
  title: 'Finora/Pages/ForgotPassword',
  component: ForgotPassword,
  parameters: {
    docs: {
      description: {
        component:
          'The "forgot password" request form. Takes no props - reads useAuth() for the submit action only, with no data fetched on mount, so this shows the initial form as-is. The "check your email" state is reached only after a real requestPasswordReset() call, so it is not shown here (would need mocking the auth service).',
      },
    },
  },
}

export const Default = {}
