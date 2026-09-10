import { Route, Routes } from 'react-router-dom'
import { AddBudget } from '../pages/AddBudget'
import { AddGoal } from '../pages/AddGoal'
import { AddTransaction } from '../pages/AddTransaction'
import { Analytics } from '../pages/Analytics'
import { Budgets } from '../pages/Budgets'
import { Dashboard } from '../pages/Dashboard'
import { ForgotPassword } from '../pages/ForgotPassword'
import { Goals } from '../pages/Goals'
import { Login } from '../pages/Login'
import { Register } from '../pages/Register'
import { ResetPassword } from '../pages/ResetPassword'
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
      <Route
        path="budgets"
        element={
          <ProtectedRoute>
            <Budgets />
          </ProtectedRoute>
        }
      />
      <Route
        path="add-budget"
        element={
          <ProtectedRoute>
            <AddBudget />
          </ProtectedRoute>
        }
      />
      <Route
        path="analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="goals"
        element={
          <ProtectedRoute>
            <Goals />
          </ProtectedRoute>
        }
      />
      <Route
        path="add-goal"
        element={
          <ProtectedRoute>
            <AddGoal />
          </ProtectedRoute>
        }
      />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
    </Routes>
  )
}
