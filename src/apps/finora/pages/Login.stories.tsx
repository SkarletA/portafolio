import { Login } from './Login'

export default {
  title: 'Finora/Pages/Login',
  component: Login,
  parameters: {
    docs: {
      description: {
        component:
          'The sign-in form. Takes no props - reads useAuth() for the submit action only, with no data fetched on mount, so this shows the initial form as-is.',
      },
    },
  },
}

export const Default = {}
