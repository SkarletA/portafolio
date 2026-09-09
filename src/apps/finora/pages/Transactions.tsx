import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { Button } from '../components/atoms/Button/Button'
import { PlusIcon, SearchIcon } from '../components/organisms/AppShell/navIcons'
import s from './Transactions.module.css'

export function Transactions() {
  const { transactions, loading, error } = useTransactions()
  const navigate = useNavigate()

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Transactions</h1>
          <p className={s.subtitle}>All your account activity in one place</p>
        </div>
        <Button
          id="transactions-add-button"
          data-testid="transactions-add-button"
          onClick={handleAddTransactionClick}
        >
          <PlusIcon /> Add transaction
        </Button>
      </div>

      <div className={s.filtersBar}>
        <div className={s.searchField}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search transactions"
            aria-label="Search transactions"
            className={s.searchInput}
            data-testid="transactions-search-input"
          />
        </div>
        <select aria-label="Filter by category" className={s.select} data-testid="transactions-category-select">
          <option>All categories</option>
        </select>
        <select aria-label="Filter by account" className={s.select} data-testid="transactions-account-select">
          <option>All accounts</option>
        </select>
      </div>

      <div className={s.card}>
        <div className={s.tableHead}>
          <span>Transaction</span>
          <span>Date</span>
          <span className={s.amountHead}>Amount</span>
        </div>

        {loading && (
          <div role="status" aria-live="polite" className={s.skeletonWrap}>
            <span className={s.srOnly}>Loading transactions…</span>
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className={s.skeletonRow} />
            ))}
          </div>
        )}

        {!loading && error && (
          <p className={s.errorMessage}>We couldn&apos;t load your transactions. Please try again later.</p>
        )}

        {!loading && !error && transactions.length === 0 && (
          <p className={s.stateMessage}>You don&apos;t have any transactions yet.</p>
        )}

        {!loading &&
          !error &&
          transactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)}
      </div>
    </section>
  )
}
