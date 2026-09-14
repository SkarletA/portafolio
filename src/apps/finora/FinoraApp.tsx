import './styles/theme.css'
import { AppShell } from './components/organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes/FinoraRoutes'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

export default function FinoraApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppShell>
          <FinoraRoutes />
        </AppShell>
      </ThemeProvider>
    </AuthProvider>
  )
}
