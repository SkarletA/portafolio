import { useCallback, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import cn from 'clsx'
import { useTransactions } from '@hooks/useTransactions'
import { useCategories } from '@hooks/useCategories'
import { TransactionItem } from '@molecules/TransactionItem/TransactionItem'
import { AsyncState } from '@molecules/AsyncState/AsyncState'
import { Button } from '@atoms/Button/Button'
import { Icon } from '@atoms/Icon/Icon'
import { Select } from '@atoms/Select/Select'
import { PAYMENT_METHODS } from '@domain/transaction'
import { getCategoryDisplayName } from '@domain/category'
import { summarizeRefundsByPurchase } from '@domain/refund'
import type { TransactionWithCategory } from '@services/transactionsService'
import { useAuth } from '@context/AuthContext'
import { useHousehold } from '@context/HouseholdContext'
import s from './Transactions.module.css'

const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({ value: method, label: method }))

type OwnerTab = 'mine' | 'household'

export function Transactions() {
  const { t } = useTranslation(['transactions', 'common', 'categories'])
  const { transactions, loading, error, refetch } = useTransactions()
  const { categories, loading: categoriesLoading } = useCategories()
  const { user } = useAuth()
  const { ownMember, partnerMember } = useHousehold()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [ownerTab, setOwnerTab] = useState<OwnerTab>('mine')

  // Both sides accepted (ADR-007), same condition useTransactions uses to
  // widen its own fetch - otherwise `transactions` only ever holds the
  // caller's own rows already, and there is nothing to split a tab over.
  const isHouseholdActive = ownMember?.status === 'accepted' && partnerMember?.status === 'accepted'

  const handleAddTransactionClick = useCallback(() => {
    navigate('/finora/add-transaction')
  }, [navigate])

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }, [])

  const handleCategoryFilterChange = useCallback((nextCategoryId: string) => {
    setCategoryId(nextCategoryId)
  }, [])

  const handlePaymentMethodFilterChange = useCallback((nextPaymentMethod: string) => {
    setPaymentMethod(nextPaymentMethod)
  }, [])

  const handleOwnerTabClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const nextTab = event.currentTarget.dataset.tab as OwnerTab | undefined
    if (nextTab) setOwnerTab(nextTab)
  }, [])

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: getCategoryDisplayName(category, t) })),
    [categories, t]
  )

  // "Household" is exactly "not mine" - a household is two people (ADR-007),
  // so there is no third owner to account for. Ungrouped when there is no
  // active household: transactions already holds only the caller's rows.
  const ownerTransactions = useMemo(() => {
    if (!isHouseholdActive) return transactions
    return transactions.filter((transaction) => (ownerTab === 'mine' ? transaction.user_id === user?.id : transaction.user_id !== user?.id))
  }, [transactions, isHouseholdActive, ownerTab, user])

  const filteredTransactions = useMemo(() => {
    const trimmedSearch = search.trim().toLowerCase()

    return ownerTransactions.filter((transaction) => {
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
  }, [ownerTransactions, search, categoryId, paymentMethod])

  // Both computed from the full, unfiltered, untabbed list (ADR-006), so a
  // search, filter or owner tab never hides a purchase's refund count or a
  // reimbursement's linked purchase - a purchase and its own reimbursements
  // always share one owner (save_transaction enforces it), so the lookup is
  // correct regardless of which tab is showing - only which rows render changes.
  const refundsByPurchase = useMemo(() => summarizeRefundsByPurchase(transactions), [transactions])
  const purchaseById = useMemo(() => {
    const map = new Map<string, TransactionWithCategory>()
    for (const transaction of transactions) {
      if (transaction.type === 'expense') map.set(transaction.id, transaction)
    }
    return map
  }, [transactions])

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

      {isHouseholdActive && (
        <div className={s.tabToggle} role="group" aria-label={t('transactions:tabs.ariaLabel')}>
          <button
            type="button"
            data-tab="mine"
            aria-pressed={ownerTab === 'mine'}
            onClick={handleOwnerTabClick}
            className={cn(s.tabButton, ownerTab === 'mine' && s.tabButtonActive)}
            data-testid="transactions-tab-mine-button"
          >
            {t('transactions:tabs.mine')}
          </button>
          <button
            type="button"
            data-tab="household"
            aria-pressed={ownerTab === 'household'}
            onClick={handleOwnerTabClick}
            className={cn(s.tabButton, ownerTab === 'household' && s.tabButtonActive)}
            data-testid="transactions-tab-household-button"
          >
            {t('transactions:tabs.household')}
          </button>
        </div>
      )}

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
        <Select
          ariaLabel={t('transactions:filters.categoryAriaLabel')}
          options={categoryOptions}
          value={categoryId}
          onChange={handleCategoryFilterChange}
          placeholder={t('transactions:filters.allCategories')}
          disabled={categoriesLoading}
          testId="transactions-category-select"
        />
        <Select
          ariaLabel={t('transactions:filters.paymentMethodAriaLabel')}
          options={PAYMENT_METHOD_OPTIONS}
          value={paymentMethod}
          onChange={handlePaymentMethodFilterChange}
          placeholder={t('transactions:filters.allPaymentMethods')}
          testId="transactions-payment-method-select"
        />
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
          isEmpty={ownerTransactions.length === 0}
          loadingLabel={t('transactions:list.loading')}
          errorMessage={t('transactions:list.error')}
          emptyMessage={ownerTab === 'household' ? t('transactions:list.emptyHousehold') : t('transactions:list.empty')}
          skeletonCount={4}
          skeletonWrapClassName={s.skeletonWrap}
          skeletonItemClassName={s.skeletonRow}
        >
          {filteredTransactions.length === 0 ? (
            <p className={s.stateMessage}>{t('transactions:list.noMatches')}</p>
          ) : (
            filteredTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onDeleted={refetch}
                refundedPurchase={transaction.refunds_transaction_id ? (purchaseById.get(transaction.refunds_transaction_id) ?? null) : null}
                refundsSummary={refundsByPurchase[transaction.id] ?? null}
              />
            ))
          )}
        </AsyncState>
      </div>
    </section>
  )
}
