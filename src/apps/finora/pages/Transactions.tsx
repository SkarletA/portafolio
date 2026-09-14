import { useCallback, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTransactions } from '../hooks/useTransactions'
import { useCategories } from '../hooks/useCategories'
import { TransactionItem } from '../components/molecules/TransactionItem/TransactionItem'
import { AsyncState } from '../components/molecules/AsyncState/AsyncState'
import { Button } from '../components/atoms/Button/Button'
import { Icon } from '../components/atoms/Icon/Icon'
import { PAYMENT_METHODS } from '../domain/transaction'
import s from './Transactions.module.css'

export function Transactions() {
  const { t } = useTranslation(['transactions', 'common'])
  const { transactions, loading, error, refetch } = useTransactions()
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
      if (paymentMethod && !transaction.payments.some((payment) => payment.payment_method === paymentMethod)) {
        return false
      }
      return true
    })
  }, [transactions, search, categoryId, paymentMethod])

  return (
    <section className={s.section}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>{t('transactions:title')}</h1>
          <p className={s.subtitle}>{t('transactions:subtitle')}</p>
        </div>
        <Button
          id="transactions-add-button"
          data-testid="transactions-add-button"
          onClick={handleAddTransactionClick}
        >
          <Icon name="plus" className={s.addIcon} /> {t('common:addTransaction')}
        </Button>
      </div>

      <div className={s.filtersBar}>
        <div className={s.searchField}>
          <Icon name="search" className={s.searchIcon} />
          <input
            type="text"
            placeholder={t('transactions:search.placeholder')}
            aria-label={t('transactions:search.ariaLabel')}
            className={s.searchInput}
            value={search}
            onChange={handleSearchChange}
            data-testid="transactions-search-input"
          />
        </div>
        <select
          aria-label={t('transactions:filters.categoryAriaLabel')}
          className={s.select}
          value={categoryId}
          onChange={handleCategoryFilterChange}
          disabled={categoriesLoading}
          data-testid="transactions-category-select"
        >
          <option value="">{t('transactions:filters.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('transactions:filters.paymentMethodAriaLabel')}
          className={s.select}
          value={paymentMethod}
          onChange={handlePaymentMethodFilterChange}
          data-testid="transactions-payment-method-select"
        >
          <option value="">{t('transactions:filters.allPaymentMethods')}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <div className={s.card}>
        <div className={s.tableHead}>
          <span>{t('transactions:table.transaction')}</span>
          <span>{t('transactions:table.date')}</span>
          <span className={s.amountHead}>{t('transactions:table.amount')}</span>
        </div>

        <AsyncState
          loading={loading}
          error={error}
          isEmpty={transactions.length === 0}
          loadingLabel={t('transactions:list.loading')}
          errorMessage={t('transactions:list.error')}
          emptyMessage={t('transactions:list.empty')}
          skeletonCount={4}
          skeletonWrapClassName={s.skeletonWrap}
          skeletonItemClassName={s.skeletonRow}
        >
          {filteredTransactions.length === 0 ? (
            <p className={s.stateMessage}>{t('transactions:list.noMatches')}</p>
          ) : (
            filteredTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} onDeleted={refetch} />
            ))
          )}
        </AsyncState>
      </div>
    </section>
  )
}
