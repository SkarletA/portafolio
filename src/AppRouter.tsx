import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

const App = lazy(() => import('./App'))
const FinoraApp = lazy(() => import('./apps/finora/FinoraApp'))

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/*" element={<App />} />
          <Route path="/finora/*" element={<FinoraApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
