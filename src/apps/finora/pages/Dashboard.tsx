import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { useTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
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
          <AsyncState
            loading={loading}
            error={error}
            isEmpty={recentTransactions.length === 0}
            loadingLabel="Loading transactions…"
            errorMessage="We couldn't load your transactions."
            emptyMessage="You don't have any transactions yet."
            skeletonCount={3}
            skeletonWrapClassName={s.skeletonWrap}
            skeletonItemClassName={s.skeletonRow}
          >
            {recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </AsyncState>
        </div>
      </div>

      <div className={s.budgetsSection}>
        <div className={s.recentHeader}>
          <h2 className={s.recentTitle}>Budgets</h2>
          <Link to="/finora/budgets" className={s.link} data-testid="dashboard-view-all-budgets-link">
            View all budgets
          </Link>
        </div>

        <AsyncState
          loading={budgetsLoading}
          error={budgetsError}
          isEmpty={previewBudgets.length === 0}
          loadingLabel="Loading budgets…"
          errorMessage="We couldn't load your budgets."
          emptyMessage="You don't have any budgets set up yet."
          skeletonCount={3}
          skeletonWrapClassName={s.skeletonWrap}
          skeletonItemClassName={s.skeletonRow}
        >
          <div className={s.budgetsGrid}>
            {previewBudgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        </AsyncState>
      </div>
    </section>
  )
}
