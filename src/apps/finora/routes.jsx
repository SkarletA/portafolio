import { Route, Routes } from 'react-router-dom'
import { Home } from './pages/Home'

export function FinoraRoutes() {
  return (
    <Routes>
      <Route index element={<Home />} />
    </Routes>
  )
}
