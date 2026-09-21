import './styles/theme.css'
import './i18n'
import { AppShell } from './components/organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes/FinoraRoutes'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { CurrencyProvider } from './context/CurrencyContext'

export default function FinoraApp() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <AppShell>
              <FinoraRoutes />
            </AppShell>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
