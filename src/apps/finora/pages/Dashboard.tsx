import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/atoms/Button/Button'
import { Icon } from '../components/atoms/Icon/Icon'
import { Avatar } from '../components/atoms/Avatar/Avatar'
import { StatCard } from '../components/molecules/StatCard/StatCard'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { useTransactions } from '../hooks/useTransactions'
import { useBudgets } from '../hooks/useBudgets'
import { useDashboardSummary } from '../hooks/useDashboardSummary'
import { getCategoryDisplayName } from '../domain/category'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { BudgetCard } from '../components/molecules/BudgetCard/BudgetCard'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import s from './Dashboard.module.css'

const RECENT_TRANSACTIONS_LIMIT = 5
const BUDGETS_PREVIEW_LIMIT = 3
const TOP_CATEGORIES_LIMIT = 3
// A CSS custom property, not a literal color, so the fallback dot follows
// the active theme (light/dark).
const NEUTRAL_CATEGORY_COLOR = 'var(--color-finora-icon-fallback-bg)'

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
  const { t } = useTranslation(['dashboard', 'common', 'categories'])
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || user?.email || ''

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
          <h1 className={s.title}>{t('dashboard:title')}</h1>
          <p className={s.subtitle}>{t('dashboard:subtitle')}</p>
        </div>
        <div className={s.headerRight}>
          <Link to="/finora/settings" className={s.profileLink} data-testid="dashboard-settings-link">
            <Avatar
              userId={user?.id ?? ''}
              avatarUrl={profile?.avatarUrl}
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              email={user?.email}
              size="sm"
            />
            <span className={s.profileName}>{displayName}</span>
          </Link>
          <span className={s.periodPill}>{monthFormatter.format(new Date())}</span>
          <Button
            id="dashboard-add-transaction-button"
            data-testid="dashboard-add-transaction-button"
            onClick={handleAddTransactionClick}
          >
            <Icon name="plus" className={s.addIcon} /> {t('common:addTransaction')}
          </Button>
        </div>
      </div>

      <AsyncState
        loading={summaryLoading}
        error={summaryError}
        isEmpty={!hasSummaryData}
        loadingLabel={t('dashboard:overview.loading')}
        errorMessage={t('dashboard:overview.error')}
        emptyMessage={t('dashboard:overview.empty')}
        skeletonCount={4}
        skeletonWrapClassName={s.overviewSkeletonWrap}
        skeletonItemClassName={s.overviewSkeletonCard}
        boxed
      >
        {stats && (
          <div className={s.overviewGrid}>
            <div className={s.balanceCard}>
              <p className={s.balanceLabel}>{t('dashboard:balanceThisMonth')}</p>
              <p className={s.balanceValue}>{currencyFormatter.format(balance)}</p>
            </div>
            <StatCard testId="dashboard-income-stat" label={t('dashboard:stats.income')} value={currencyFormatter.format(stats.totalIncome)} />
            <StatCard testId="dashboard-expenses-stat" label={t('dashboard:stats.expenses')} value={currencyFormatter.format(stats.totalSpent)} />
            <StatCard
              testId="dashboard-savings-rate-stat"
              label={t('dashboard:stats.savingsRate')}
              value={formatPercentage(stats.savingsRate)}
              variant={stats.savingsRate >= 0 ? 'success' : 'danger'}
            />
          </div>
        )}
      </AsyncState>

      <div className={s.contentRow}>
        <div className={s.recentSection}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>{t('dashboard:recentTransactions.title')}</h2>
            <Link to="/finora/transactions" className={s.link} data-testid="dashboard-view-all-transactions-link">
              {t('dashboard:viewAll')}
            </Link>
          </div>

          <div className={s.card}>
            <AsyncState
              loading={loading}
              error={error}
              isEmpty={recentTransactions.length === 0}
              loadingLabel={t('dashboard:recentTransactions.loading')}
              errorMessage={t('dashboard:recentTransactions.error')}
              emptyMessage={t('dashboard:recentTransactions.empty')}
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
            <h2 className={s.sectionTitle}>{t('dashboard:categorySpending.title')}</h2>
            <Link to="/finora/analytics" className={s.link} data-testid="dashboard-view-analytics-link">
              {t('dashboard:viewAll')}
            </Link>
          </div>

          <div className={s.card}>
            <AsyncState
              loading={summaryLoading}
              error={summaryError}
              isEmpty={topCategories.length === 0}
              loadingLabel={t('dashboard:categorySpending.loading')}
              errorMessage={t('dashboard:categorySpending.error')}
              emptyMessage={t('dashboard:categorySpending.empty')}
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
                    <span className={s.categoryName}>{getCategoryDisplayName(category, t)}</span>
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
          <h2 className={s.sectionTitle}>{t('dashboard:budgets.title')}</h2>
          <Link to="/finora/budgets" className={s.link} data-testid="dashboard-view-all-budgets-link">
            {t('dashboard:viewAll')}
          </Link>
        </div>

        <AsyncState
          loading={budgetsLoading}
          error={budgetsError}
          isEmpty={previewBudgets.length === 0}
          loadingLabel={t('dashboard:budgets.loading')}
          errorMessage={t('dashboard:budgets.error')}
          emptyMessage={t('dashboard:budgets.empty')}
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
