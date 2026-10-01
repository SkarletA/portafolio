import { isIncomeFundedExpense, isIncomeFundedReimbursement } from './installments'
import { addMoney, sumMoney } from './money'
import type { FundingSource, TransactionType } from './transaction'

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  parent_id: string | null
  translationKey: string | null
}

// Seed categories carry a translationKey so their name follows the active
// UI language; a user-created category has translationKey: null and always
// displays its stored name as-is, since it's free text, not UI copy.
export function getCategoryDisplayName(
  category: Pick<Category, 'name' | 'translationKey'>,
  t: (key: string) => string
): string {
  return category.translationKey ? t(`categories:${category.translationKey}`) : category.name
}

export interface CategoryGroup {
  parent: Category
  children: Category[]
}

export function buildCategoryTree(categories: Category[]): CategoryGroup[] {
  const parents = categories.filter((category) => !category.parent_id)
  const childrenByParentId = new Map<string, Category[]>()

  for (const category of categories) {
    if (category.parent_id) {
      const siblings = childrenByParentId.get(category.parent_id) ?? []
      siblings.push(category)
      childrenByParentId.set(category.parent_id, siblings)
    }
  }

  return parents.map((parent) => ({
    parent,
    children: childrenByParentId.get(parent.id) ?? [],
  }))
}

export function getCategoryIdsForRollup(categories: Category[], categoryId: string): string[] {
  const childrenIds = categories
    .filter((category) => category.parent_id === categoryId)
    .map((category) => category.id)

  return childrenIds.length > 0 ? [categoryId, ...childrenIds] : [categoryId]
}

export interface CategoryBreakdownItem {
  category_id: string
  name: string
  icon: string | null
  color: string | null
  translationKey: string | null
  amount: number
}

const OTHER_BREAKDOWN_LABEL = 'Other'

// A parent category's own spend can have direct transactions too (the
// subcategory picker is optional), so the breakdown needs an "Other" row for
// that direct spend - otherwise the subcategories alone wouldn't reconcile
// with the parent's rolled-up total. Shared by a budget's subcategory
// breakdown (useBudgets) and Analytics' Spending-by-category breakdown -
// one source of truth for "how does this category's spend split by
// subcategory," not a copy per feature.
export function buildCategoryBreakdown(
  categoryId: string,
  categories: Category[],
  rawByCategory: Record<string, number>
): CategoryBreakdownItem[] {
  const children = categories.filter((category) => category.parent_id === categoryId)
  if (children.length === 0) return []

  const items: CategoryBreakdownItem[] = children.map((child) => ({
    category_id: child.id,
    name: child.name,
    icon: child.icon,
    color: child.color,
    translationKey: child.translationKey,
    amount: rawByCategory[child.id] ?? 0,
  }))

  const directToParent = rawByCategory[categoryId] ?? 0
  if (directToParent > 0) {
    items.push({
      category_id: `${categoryId}:other`,
      name: OTHER_BREAKDOWN_LABEL,
      icon: null,
      color: null,
      translationKey: null,
      amount: directToParent,
    })
  }

  return items.sort((a, b) => b.amount - a.amount)
}

export interface CategoryLedgerEntry {
  category_id: string | null
  type: TransactionType
  amount: number
  funding_source: FundingSource
}

// Sums each category's own entries that match `predicate`, before any
// parent/child rollup. Entries without a category are skipped.
function sumByCategory(
  entries: CategoryLedgerEntry[],
  predicate: (entry: CategoryLedgerEntry) => boolean
): Record<string, number> {
  return entries.reduce<Record<string, number>>((totals, entry) => {
    if (!entry.category_id || !predicate(entry)) return totals

    totals[entry.category_id] = addMoney(totals[entry.category_id] ?? 0, entry.amount)
    return totals
  }, {})
}

function rollupByCategory(rawByCategory: Record<string, number>, categories: Category[]): Record<string, number> {
  const totalsByCategory: Record<string, number> = {}

  for (const category of categories) {
    const rollupIds = getCategoryIdsForRollup(categories, category.id)
    totalsByCategory[category.id] = sumMoney(rollupIds.map((id) => rawByCategory[id] ?? 0))
  }

  return totalsByCategory
}

// Gross spend per category on its own (sum of income-funded expense amounts
// only), before any parent/child rollup. Reimbursements do not net against
// spend - see docs/adr/002-gross-spend-and-effective-limit.md - they widen a
// budget's effective limit instead (getReimbursementsByCategory). Expenses
// covered by savings are left out and summed by getSavingsCoveredByCategory
// instead - see docs/adr/003-installments-and-savings-funding.md. Callers pass
// entries already expanded into installments. Exposed on its own
// so callers that need per-category figures without rolling children into
// their parent (e.g. a budget's subcategory breakdown) don't duplicate this
// summing logic.
export function getRawGrossSpendByCategory(entries: CategoryLedgerEntry[]): Record<string, number> {
  return sumByCategory(entries, isIncomeFundedExpense)
}

// Gross spend per category = sum(income-funded expense amounts) across the category and its
// subcategories (if it has any). A sum of non-negative expense amounts is
// always non-negative, so unlike the net calculation this ADR-002 replaced,
// no floor is needed regardless of rollup order.
// See docs/adr/002-gross-spend-and-effective-limit.md.
export function getGrossSpendByCategory(entries: CategoryLedgerEntry[], categories: Category[]): Record<string, number> {
  return rollupByCategory(getRawGrossSpendByCategory(entries), categories)
}

// Reimbursements per category, rolled up the same way as gross spend, so a
// budget's effective limit (monthly_limit + reimbursements) can be computed
// per rollup scope. Reimbursements linked to a savings-funded purchase are left
// out: their money returns to the Goal. See
// docs/adr/002-gross-spend-and-effective-limit.md and
// docs/adr/006-reimbursement-purchase-links.md.
export function getReimbursementsByCategory(entries: CategoryLedgerEntry[], categories: Category[]): Record<string, number> {
  return rollupByCategory(sumByCategory(entries, isIncomeFundedReimbursement), categories)
}

// Expenses covered by savings per category, rolled up the same way as gross
// spend. They don't count against a budget or the savings rate, so this is
// reported next to them instead of disappearing.
// See docs/adr/003-installments-and-savings-funding.md.
export function getSavingsCoveredByCategory(entries: CategoryLedgerEntry[], categories: Category[]): Record<string, number> {
  return rollupByCategory(
    sumByCategory(entries, (entry) => entry.type === 'expense' && entry.funding_source === 'savings'),
    categories
  )
}
