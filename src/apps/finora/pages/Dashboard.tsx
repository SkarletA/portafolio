import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import { Icon } from '../components/atoms/Icon/Icon'
import { StatCard } from '../components/molecules/StatCard/StatCard'
import { useTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import s from './Dashboard.module.css'

const RECENT_TRANSACTIONS_LIMIT = 5
const BUDGETS_PREVIEW_LIMIT = 3
const TOP_CATEGORIES_LIMIT = 3
const NEUTRAL_CATEGORY_COLOR = '#94a3b8'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function formatPercentage(value: number) {
  return `${Math.round(value)}%`
}

export function Dashboard() {
  const navigate = useNavigate()

  const { transactions, loading, error, refetch } = useTransactions()
  const recentTransactions = transactions.slice(0, RECENT_TRANSACTIONS_LIMIT)

  const { budgets, loading: budgetsLoading, error: budgetsError } = useBudgets()
  const previewBudgets = budgets.slice(0, BUDGETS_PREVIEW_LIMIT)

  const { stats, spendingByCategory, loading: summaryLoading, error: summaryError } = useDashboardSummary()
  const topCategories = spendingByCategory.slice(0, TOP_CATEGORIES_LIMIT)
  const hasSummaryData = !!stats && (stats.totalSpent > 0 || stats.totalIncome > 0)
  const balance = stats ? stats.totalIncome - stats.totalSpent : 0

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Dashboard</h1>
          <p className={s.subtitle}>Here&apos;s your financial overview</p>
        </div>
        <div className={s.headerRight}>
          <span className={s.periodPill}>{monthFormatter.format(new Date())}</span>
          <Button
            id="dashboard-add-transaction-button"
            data-testid="dashboard-add-transaction-button"
            onClick={handleAddTransactionClick}
          >
            <Icon name="plus" className={s.addIcon} /> Add transaction
          </Button>
        </div>
      </div>

      <AsyncState
        loading={summaryLoading}
        error={summaryError}
        isEmpty={!hasSummaryData}
        loadingLabel="Loading overview…"
        errorMessage="We couldn't load your overview. Please try again later."
        emptyMessage="No activity recorded this month yet."
        skeletonCount={4}
        skeletonWrapClassName={s.overviewSkeletonWrap}
        skeletonItemClassName={s.overviewSkeletonCard}
        boxed
      >
        {stats && (
          <div className={s.overviewGrid}>
            <div className={s.balanceCard}>
              <p className={s.balanceLabel}>Balance this month</p>
              <p className={s.balanceValue}>{currencyFormatter.format(balance)}</p>
            </div>
            <StatCard testId="dashboard-income-stat" label="Income" value={currencyFormatter.format(stats.totalIncome)} />
            <StatCard testId="dashboard-expenses-stat" label="Expenses" value={currencyFormatter.format(stats.totalSpent)} />
            <StatCard
              testId="dashboard-savings-rate-stat"
              label="Savings rate"
              value={formatPercentage(stats.savingsRate)}
              variant={stats.savingsRate >= 0 ? 'success' : 'danger'}
            />
          </div>
        )}
      </AsyncState>

      <div className={s.contentRow}>
        <div className={s.recentSection}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Recent transactions</h2>
            <Link to="/finora/transactions" className={s.link} data-testid="dashboard-view-all-transactions-link">
              View all
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
                <TransactionItem key={transaction.id} transaction={transaction} onDeleted={refetch} />
              ))}
            </AsyncState>
          </div>
        </div>

        <div className={s.categorySection}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Spending by category</h2>
            <Link to="/finora/analytics" className={s.link} data-testid="dashboard-view-analytics-link">
              View all
            </Link>
          </div>

          <div className={s.card}>
            <AsyncState
              loading={summaryLoading}
              error={summaryError}
              isEmpty={topCategories.length === 0}
              loadingLabel="Loading categories…"
              errorMessage="We couldn't load your spending by category."
              emptyMessage="No spending recorded this month."
              skeletonCount={3}
              skeletonWrapClassName={s.skeletonWrap}
              skeletonItemClassName={s.skeletonRow}
            >
              <ul className={s.categoryList}>
                {topCategories.map((category) => (
                  <li key={category.category_id} className={s.categoryRow}>
                    <span
                      className={s.categoryDot}
                      style={{ backgroundColor: category.color ?? NEUTRAL_CATEGORY_COLOR }}
                    />
                    <span className={s.categoryName}>{category.name}</span>
                    <span className={s.categoryAmount}>{currencyFormatter.format(category.amount)}</span>
                  </li>
                ))}
              </ul>
            </AsyncState>
          </div>
        </div>
      </div>

      <div className={s.budgetsSection}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}>Budgets</h2>
          <Link to="/finora/budgets" className={s.link} data-testid="dashboard-view-all-budgets-link">
            View all
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
          skeletonItemClassName={s.skeletonCard}
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
