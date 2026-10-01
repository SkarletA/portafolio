import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@atoms/Button/Button'
import { GroupedSelect } from '@atoms/Select/GroupedSelect'
import { useAuth } from '@context/AuthContext'
import { useHousehold } from '@context/HouseholdContext'
import { useCategories } from '@hooks/useCategories'
import { useBudgets } from '@hooks/useBudgets'
import { BackLink } from '@molecules/BackLink/BackLink'
import { createBudget, type NewBudgetInput } from '@services/budgetsService'
import { buildCategoryTree, getCategoryDisplayName } from '@domain/category'
import { getHouseholdPartnerDisplayName } from '@domain/household'
import { roundMoneyInput } from '@domain/money'
import s from './AddBudget.module.css'

interface FormErrors {
  category_id?: string
  monthly_limit?: string
  household?: string
}

export function AddBudget() {
  const { t } = useTranslation(['budgets', 'common', 'categories'])
  const navigate = useNavigate()
  const { user } = useAuth()
  const { partnerMember, partner } = useHousehold()
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories()
  const { budgets, loading: budgetsLoading } = useBudgets()

  const hasAcceptedPartner = partnerMember?.status === 'accepted'
  const partnerName = getHouseholdPartnerDisplayName(partner)

  const [categoryId, setCategoryId] = useState('')
  const [monthlyLimit, setMonthlyLimit] = useState('')
  const [isHousehold, setIsHousehold] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Categories I've already budgeted myself, personal or household - a
  // household budget of my partner's doesn't take a category away from me,
  // it's handled by the duplicate guard below instead. getBudgets() already
  // widens to include my partner's household budgets (ADR-010), so this list
  // can hold rows that aren't mine.
  const budgetedCategoryIds = useMemo(
    () => new Set(budgets.filter((budget) => budget.user_id === user?.id).map((budget) => budget.category_id)),
    [budgets, user?.id]
  )

  // Every household budget already in play (mine or my partner's), keyed by
  // category - the competing-household-budget guard (ADR-010, PR8).
  const householdBudgetByCategory = useMemo(() => {
    const map = new Map<string, (typeof budgets)[number]>()
    for (const budget of budgets) {
      if (budget.is_household) map.set(budget.category_id, budget)
    }
    return map
  }, [budgets])

  const competingHouseholdBudget =
    isHousehold && categoryId ? householdBudgetByCategory.get(categoryId) : undefined

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories])

  // A parent that's already budgeted is kept as a (disabled) group header
  // only if it still has un-budgeted children under it - a category and its
  // subcategories can each carry their own budget independently (see
  // docs/adr/001-net-category-spend-calculation.md), so a budgeted parent
  // doesn't imply its children are unavailable too.
  const budgetGroups = useMemo(() => {
    return categoryTree
      .map((group) => ({
        value: group.parent.id,
        label: getCategoryDisplayName(group.parent, t),
        disabled: budgetedCategoryIds.has(group.parent.id),
        children: group.children
          .filter((child) => !budgetedCategoryIds.has(child.id))
          .map((child) => ({ value: child.id, label: getCategoryDisplayName(child, t) })),
      }))
      .filter((group) => !group.disabled || group.children.length > 0)
  }, [categoryTree, budgetedCategoryIds, t])

  const loadingOptions = categoriesLoading || budgetsLoading
  const noAvailableCategories = !loadingOptions && !categoriesError && budgetGroups.length === 0

  const handleCategoryChange = useCallback((nextCategoryId: string) => {
    setCategoryId(nextCategoryId)
    setErrors((prev) => (prev.category_id || prev.household ? { ...prev, category_id: undefined, household: undefined } : prev))
  }, [])

  const handleMonthlyLimitChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setMonthlyLimit(event.target.value)
    setErrors((prev) => (prev.monthly_limit ? { ...prev, monthly_limit: undefined } : prev))
  }, [])

  const handleHouseholdChange = useCallback(() => {
    setIsHousehold((prev) => !prev)
    setErrors((prev) => (prev.household ? { ...prev, household: undefined } : prev))
  }, [])

  // Visible rounding to 2 decimals, so the user sees what will be saved (ADR-004).
  const handleMonthlyLimitBlur = useCallback(() => {
    setMonthlyLimit((prev) => roundMoneyInput(prev))
  }, [])

  const handleSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      const parsedLimit = Number(monthlyLimit)
      const nextErrors: FormErrors = {}

      if (!categoryId) {
        nextErrors.category_id = t('budgets:validation.selectCategory')
      }
      if (!monthlyLimit || Number.isNaN(parsedLimit) || parsedLimit <= 0) {
        nextErrors.monthly_limit = t('budgets:validation.limitGreaterThanZero')
      } else if (roundMoneyInput(monthlyLimit) !== monthlyLimit) {
        // Submitted before leaving the field (e.g. with Enter); the column would round it silently.
        nextErrors.monthly_limit = t('budgets:validation.amountMaxDecimals')
      }

      // Nothing stops both members from independently creating a competing
      // household budget in the same category - a UI guard, not a database
      // constraint. See docs/adr/010-household-expense-tag-and-household-budget.md.
      if (isHousehold && competingHouseholdBudget) {
        nextErrors.household = t('budgets:validation.householdDuplicate', { partner: partnerName ?? '' })
      }

      setErrors(nextErrors)

      if (Object.keys(nextErrors).length > 0) return

      setSubmitting(true)
      setSubmitError(null)

      const input: NewBudgetInput = {
        category_id: categoryId,
        monthly_limit: parsedLimit,
        is_household: isHousehold,
      }

      const { error } = await createBudget(input)

      setSubmitting(false)

      if (error) {
        setSubmitError(error.message)
        return
      }

      navigate('/finora/budgets')
    },
    [categoryId, monthlyLimit, isHousehold, competingHouseholdBudget, partnerName, navigate, t]
  )

  return (
    <section className={s.section}>
      <BackLink to="/finora/budgets" data-testid="add-budget-back-link">
        {t('budgets:form.backToBudgets')}
      </BackLink>
      <h1 className={s.title}>{t('budgets:form.title')}</h1>

      <form onSubmit={handleSubmit} className={s.form} noValidate>
        <label className={s.field}>
          {t('budgets:form.category')}
          <GroupedSelect
            groups={budgetGroups}
            value={categoryId}
            onChange={handleCategoryChange}
            placeholder={
              loadingOptions
                ? t('budgets:form.loadingCategories')
                : noAvailableCategories
                  ? t('budgets:form.noCategoriesAvailable')
                  : t('budgets:form.selectCategory')
            }
            disabled={loadingOptions || noAvailableCategories}
            ariaInvalid={!!errors.category_id}
            ariaDescribedBy={errors.category_id ? 'add-budget-category-error' : undefined}
            testId="add-budget-category-select"
          />
          {errors.category_id && (
            <p id="add-budget-category-error" role="alert" className={s.error}>
              {errors.category_id}
            </p>
          )}
          {categoriesError && (
            <p role="alert" className={s.error}>
              {t('budgets:form.couldntLoadCategories', { message: categoriesError })}
            </p>
          )}
          {noAvailableCategories && (
            <p className={s.hint}>{t('budgets:form.allCategoriesBudgeted')}</p>
          )}
        </label>

        <label className={s.field}>
          {t('budgets:form.monthlyLimit')}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={monthlyLimit}
            onChange={handleMonthlyLimitChange}
            onBlur={handleMonthlyLimitBlur}
            className={s.input}
            aria-invalid={!!errors.monthly_limit}
            aria-describedby={errors.monthly_limit ? 'add-budget-monthly-limit-error' : undefined}
            data-testid="add-budget-monthly-limit-input"
          />
          {errors.monthly_limit && (
            <p id="add-budget-monthly-limit-error" role="alert" className={s.error}>
              {errors.monthly_limit}
            </p>
          )}
        </label>

        <fieldset className={s.householdFieldset}>
          <label className={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={isHousehold}
              onChange={handleHouseholdChange}
              disabled={!hasAcceptedPartner}
              aria-describedby="add-budget-household-hint"
              data-testid="add-budget-household-checkbox"
            />
            {t('budgets:form.householdBudget')}
          </label>
          <p id="add-budget-household-hint" className={s.hint}>
            {hasAcceptedPartner ? t('budgets:form.householdBudgetHint') : t('budgets:form.householdBudgetDisabledHint')}
          </p>

          {errors.household && (
            <p role="alert" className={s.error} data-testid="add-budget-household-duplicate-warning">
              {errors.household}{' '}
              <Link to="/finora/budgets" data-testid="add-budget-household-duplicate-link">
                {t('budgets:form.viewExistingHouseholdBudget')}
              </Link>
            </p>
          )}
        </fieldset>

        {submitError && (
          <p role="alert" className={s.error}>
            {submitError}
          </p>
        )}

        <Button
          id="add-budget-save-button"
          data-testid="add-budget-save-button"
          type="submit"
          disabled={submitting || noAvailableCategories}
        >
          {submitting ? t('common:buttons.saving') : t('budgets:form.saveBudget')}
        </Button>
      </form>
    </section>
  )
}
