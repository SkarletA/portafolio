import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { Button } from '../components/atoms/Button/Button'
import { Icon } from '../components/atoms/Icon/Icon'
import s from './Transactions.module.css'

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer']

export function Transactions() {
  const { transactions, loading, error } = useTransactions()
  const { categories, loading: categoriesLoading } = useCategories()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }, [])

  const handleCategoryFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(event.target.value)
  }, [])

  const handlePaymentMethodFilterChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setPaymentMethod(event.target.value)
  }, [])

  const filteredTransactions = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase()

    return transactions.filter((transaction) => {
      if (trimmedSearch && !transaction.description.toLowerCase().includes(trimmedSearch)) {
        return false
      }
      if (categoryId && transaction.category_id !== categoryId) {
        return false
      }
      if (paymentMethod && transaction.payment_method !== paymentMethod) {
        return false
      }
      return true
    })
  }, [transactions, search, categoryId, paymentMethod])

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
          <Icon name="plus" className={s.addIcon} /> Add transaction
        </Button>
      </div>

      <div className={s.filtersBar}>
        <div className={s.searchField}>
          <Icon name="search" className={s.searchIcon} />
          <input
            type="text"
            placeholder="Search transactions"
            aria-label="Search transactions"
            className={s.searchInput}
            value={search}
            onChange={handleSearchChange}
            data-testid="transactions-search-input"
          />
        </div>
        <select
          aria-label="Filter by category"
          className={s.select}
          value={categoryId}
          onChange={handleCategoryFilterChange}
          disabled={categoriesLoading}
          data-testid="transactions-category-select"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by payment method"
          className={s.select}
          value={paymentMethod}
          onChange={handlePaymentMethodFilterChange}
          data-testid="transactions-payment-method-select"
        >
          <option value="">All payment methods</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
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

        {!loading && !error && transactions.length > 0 && filteredTransactions.length === 0 && (
          <p className={s.stateMessage}>No transactions match your filters.</p>
        )}

        {!loading &&
          !error &&
          filteredTransactions.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} />)}
      </div>
    </section>
  )
}
