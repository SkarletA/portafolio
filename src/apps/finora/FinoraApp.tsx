import './styles/theme.css'
import './i18n'
import { AppShell } from '@organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes/FinoraRoutes'
import { AuthProvider } from '@context/AuthContext'
import { ThemeProvider } from '@context/ThemeContext'
import { LanguageProvider } from '@context/LanguageContext'
import { CurrencyProvider } from '@context/CurrencyContext'
import { HouseholdProvider } from '@context/HouseholdContext'
import { useDocumentMeta } from '../../hooks/useDocumentMeta'

export default function FinoraApp() {
  useDocumentMeta({
    title: 'Finora — Take control of your money',
    description: 'Track spending, manage budgets, and reach your savings goals — all in one place.',
    favicon: '/finora-favicon.svg',
  })

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <CurrencyProvider>
            <HouseholdProvider>
              <AppShell>
                <FinoraRoutes />
              </AppShell>
            </HouseholdProvider>
          </CurrencyProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
