import { Route, Routes } from 'react-router-dom'
import { AddTransaction } from '../pages/AddTransaction'
import { Dashboard } from '../pages/Dashboard'
import { Login } from '../pages/Login'
import { Register } from '../pages/Register'
import { Transactions } from '../pages/Transactions'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function FinoraRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="add-transaction"
        element={
          <ProtectedRoute>
            <AddTransaction />
          </ProtectedRoute>
        }
      />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
    </Routes>
  )
}
