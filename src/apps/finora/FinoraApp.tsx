import './styles/theme.css'
import './i18n'
import { AppShell } from './components/organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes/FinoraRoutes'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'

export default function FinoraApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppShell>
            <FinoraRoutes />
          </AppShell>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
