import type { TransactionType } from './transaction'

export interface Category {
  id: string
  name: string
  icon: string | null
  color: string | null
  parent_id: string | null
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

export interface CategoryLedgerEntry {
  category_id: string | null
  type: TransactionType
  amount: number
}

// Net spend per category = sum(expenses) - sum(reimbursements) across the category
// and its subcategories (if it has any), clamped to a minimum of 0 once per
// category's rollup scope - never clamped per-transaction or per-child before
// the rollup sum, so a subcategory's reimbursements can still offset a sibling
// subcategory's expenses at the parent level. See docs/adr/001-net-category-spend-calculation.md.
export function getNetSpendByCategory(entries: CategoryLedgerEntry[], categories: Category[]): Record<string, number> {
  const netByCategory = entries.reduce<Record<string, number>>((totals, entry) => {
    if (!entry.category_id || entry.type === 'income') return totals

    const delta = entry.type === 'expense' ? entry.amount : -entry.amount
    totals[entry.category_id] = (totals[entry.category_id] ?? 0) + delta
    return totals
  }, {})

  const totalsByCategory: Record<string, number> = {}

  for (const category of categories) {
    const rollupIds = getCategoryIdsForRollup(categories, category.id)
    const net = rollupIds.reduce((sum, id) => sum + (netByCategory[id] ?? 0), 0)
    totalsByCategory[category.id] = Math.max(net, 0)
  }

  return totalsByCategory
}
