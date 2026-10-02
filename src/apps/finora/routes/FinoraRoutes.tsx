import { Route, Routes } from 'react-router-dom'
import { AddBudget } from '../pages/AddBudget/AddBudget'
import { AddGoal } from '../pages/AddGoal/AddGoal'
import { AddTransaction } from '../pages/AddTransaction/AddTransaction'
import { Analytics } from '../pages/Analytics/Analytics'
import { Budgets } from '../pages/Budgets/Budgets'
import { Dashboard } from '../pages/Dashboard/Dashboard'
import { ForgotPassword } from '../pages/ForgotPassword/ForgotPassword'
import { Goals } from '../pages/Goals/Goals'
import { Login } from '../pages/Login/Login'
import { Register } from '../pages/Register/Register'
import { ResetPassword } from '../pages/ResetPassword/ResetPassword'
import { Settings } from '../pages/Settings/Settings'
import { Transactions } from '../pages/Transactions/Transactions'
import { ProtectedRoute } from '@components/ProtectedRoute'

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
            <AddTransaction mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="transactions/:id/edit"
        element={
          <ProtectedRoute>
            <AddTransaction mode="edit" />
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
            <AddBudget mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="budgets/:id/edit"
        element={
          <ProtectedRoute>
            <AddBudget mode="edit" />
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
            <AddGoal mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="goals/:id/edit"
        element={
          <ProtectedRoute>
            <AddGoal mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="settings"
        element={
          <ProtectedRoute>
            <Settings />
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
