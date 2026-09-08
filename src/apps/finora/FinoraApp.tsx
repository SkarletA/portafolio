import './styles/theme.css'
import { AppShell } from './components/organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes/FinoraRoutes'
import { AuthProvider } from './context/AuthContext'

export default function FinoraApp() {
  return (
    <AuthProvider>
      <AppShell>
        <FinoraRoutes />
      </AppShell>
    </AuthProvider>
  )
}
