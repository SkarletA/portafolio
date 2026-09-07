import './styles/theme.css'
import { AppShell } from './components/organisms/AppShell/AppShell'
import { FinoraRoutes } from './routes'

export default function FinoraApp() {
  return (
    <AppShell>
      <FinoraRoutes />
    </AppShell>
  )
}
