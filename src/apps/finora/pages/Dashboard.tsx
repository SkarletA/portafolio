import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import s from './Dashboard.module.css'

const RECENT_TRANSACTIONS_LIMIT = 5
const BUDGETS_PREVIEW_LIMIT = 3

export function Dashboard() {
  const { transactions, loading, error } = useTransactions()
  const recentTransactions = transactions.slice(0, RECENT_TRANSACTIONS_LIMIT)

  const { budgets, loading: budgetsLoading, error: budgetsError } = useBudgets()
  const previewBudgets = budgets.slice(0, BUDGETS_PREVIEW_LIMIT)

  return (
    <section className={s.section}>
      <p className={s.eyebrow}>Finora</p>
      <h1 className={s.title}>Personal finance, coming together</h1>
      <p className={s.subtitle}>
        Finora is being built as a real product inside this portfolio — expense tracking, budgets, and insights are
        on the way.
      </p>
      <div className={s.actions}>
        <Button id="dashboard-get-notified-button" data-testid="dashboard-get-notified-button">
          Get notified
        </Button>
      </div>

      <div className={s.recentSection}>
        <div className={s.recentHeader}>
          <h2 className={s.recentTitle}>Recent transactions</h2>
          <Link
            to="/finora/transactions"
            className={s.link}
            data-testid="dashboard-view-all-transactions-link"
          >
            View all transactions
          </Link>
        </div>

        <div className={s.card}>
          {loading && (
            <div role="status" aria-live="polite" className={s.skeletonWrap}>
              <span className={s.srOnly}>Loading transactions…</span>
              {[0, 1, 2].map((key) => (
                <div key={key} className={s.skeletonRow} />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className={s.errorMessage}>We couldn&apos;t load your transactions.</p>
          )}

          {!loading && !error && recentTransactions.length === 0 && (
            <p className={s.stateMessage}>You don&apos;t have any transactions yet.</p>
          )}

          {!loading &&
            !error &&
            recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
        </div>
      </div>

      <div className={s.budgetsSection}>
        <div className={s.recentHeader}>
          <h2 className={s.recentTitle}>Budgets</h2>
          <Link to="/finora/budgets" className={s.link} data-testid="dashboard-view-all-budgets-link">
            View all budgets
          </Link>
        </div>

        {budgetsLoading && (
          <div role="status" aria-live="polite" className={s.skeletonWrap}>
            <span className={s.srOnly}>Loading budgets…</span>
            {[0, 1, 2].map((key) => (
              <div key={key} className={s.skeletonRow} />
            ))}
          </div>
        )}

        {!budgetsLoading && budgetsError && (
          <p className={s.errorMessage}>We couldn&apos;t load your budgets.</p>
        )}

        {!budgetsLoading && !budgetsError && previewBudgets.length === 0 && (
          <p className={s.stateMessage}>Aún no tienes presupuestos configurados</p>
        )}

        {!budgetsLoading && !budgetsError && previewBudgets.length > 0 && (
          <div className={s.budgetsGrid}>
            {previewBudgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
