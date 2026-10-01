import { describe, expect, it } from 'vitest'
import {
  buildCategoryBreakdown,
  buildCategoryTree,
  getCategoryDisplayName,
  getCategoryIdsForRollup,
  getGrossSpendByCategory,
  getRawGrossSpendByCategory,
  getReimbursementsByCategory,
  getSavingsCoveredByCategory,
  type Category,
} from './category'

const food: Category = { id: 'food', name: 'Food', icon: 'utensils', color: null, parent_id: null, translationKey: 'food' }
const meat: Category = { id: 'meat', name: 'Carne', icon: 'beef', color: null, parent_id: 'food', translationKey: 'meat' }
const market: Category = {
  id: 'market',
  name: 'Mercado',
  icon: 'shopping-cart',
  color: null,
  parent_id: 'food',
  translationKey: 'groceries',
}
const transport: Category = {
  id: 'transport',
  name: 'Transportation',
  icon: 'car',
  color: null,
  parent_id: null,
  translationKey: 'transportation',
}

const categories = [food, meat, market, transport]

describe('buildCategoryTree', () => {
  it('groups top-level categories with their children', () => {
    expect(buildCategoryTree(categories)).toEqual([
      { parent: food, children: [meat, market] },
      { parent: transport, children: [] },
    ])
  })
})

describe('getCategoryIdsForRollup', () => {
  it("returns a parent's id plus its children's ids when it has children", () => {
    expect(getCategoryIdsForRollup(categories, 'food')).toEqual(['food', 'meat', 'market'])
  })

  it('returns only its own id when the category has no children', () => {
    expect(getCategoryIdsForRollup(categories, 'meat')).toEqual(['meat'])
    expect(getCategoryIdsForRollup(categories, 'transport')).toEqual(['transport'])
  })
})

describe('getRawGrossSpendByCategory', () => {
  it('sums expense amounts per category without rolling children into their parent', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200, funding_source: 'income' as const },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50, funding_source: 'income' as const },
      { category_id: 'market', type: 'expense' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'food', type: 'expense' as const, amount: 20, funding_source: 'income' as const },
    ]

    expect(getRawGrossSpendByCategory(entries)).toEqual({
      meat: 200,
      market: 300,
      food: 20,
    })
  })

  it('ignores entries with no category, income entries, and reimbursement entries', () => {
    const entries = [
      { category_id: null, type: 'expense' as const, amount: 999, funding_source: 'income' as const },
      { category_id: 'transport', type: 'income' as const, amount: 500, funding_source: 'income' as const },
      { category_id: 'transport', type: 'reimbursement' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'transport', type: 'expense' as const, amount: 40, funding_source: 'income' as const },
    ]

    expect(getRawGrossSpendByCategory(entries)).toEqual({ transport: 40 })
  })
})

describe('getGrossSpendByCategory', () => {
  it('rolls up subcategory expenses into the parent without double counting', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200, funding_source: 'income' as const },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50, funding_source: 'income' as const },
      { category_id: 'market', type: 'expense' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'transport', type: 'expense' as const, amount: 100, funding_source: 'income' as const },
    ]

    expect(getGrossSpendByCategory(entries, categories)).toEqual({
      food: 500,
      meat: 200,
      market: 300,
      transport: 100,
    })
  })

  it('never needs a floor, since a sum of expense amounts is always non-negative', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 100, funding_source: 'income' as const },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'market', type: 'expense' as const, amount: 50, funding_source: 'income' as const },
    ]

    expect(getGrossSpendByCategory(entries, categories)).toEqual({
      food: 150,
      meat: 100,
      market: 50,
      transport: 0,
    })
  })

  it('ignores entries with no category and entries of type income', () => {
    const entries = [
      { category_id: null, type: 'expense' as const, amount: 999, funding_source: 'income' as const },
      { category_id: 'transport', type: 'income' as const, amount: 500, funding_source: 'income' as const },
      { category_id: 'transport', type: 'expense' as const, amount: 40, funding_source: 'income' as const },
    ]

    expect(getGrossSpendByCategory(entries, categories).transport).toBe(40)
  })

  it('does not roll a budget on a specific subcategory up to its sibling', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200, funding_source: 'income' as const },
      { category_id: 'market', type: 'expense' as const, amount: 9000, funding_source: 'income' as const },
    ]

    expect(getGrossSpendByCategory(entries, categories).meat).toBe(200)
  })
})

describe('getReimbursementsByCategory', () => {
  it('rolls up subcategory reimbursements into the parent', () => {
    const entries = [
      { category_id: 'meat', type: 'reimbursement' as const, amount: 200, funding_source: 'income' as const },
      { category_id: 'market', type: 'reimbursement' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'meat', type: 'expense' as const, amount: 999, funding_source: 'income' as const },
    ]

    expect(getReimbursementsByCategory(entries, categories)).toEqual({
      food: 500,
      meat: 200,
      market: 300,
      transport: 0,
    })
  })

  it('ignores expense and income entries', () => {
    const entries = [
      { category_id: 'transport', type: 'expense' as const, amount: 40, funding_source: 'income' as const },
      { category_id: 'transport', type: 'income' as const, amount: 500, funding_source: 'income' as const },
    ]

    expect(getReimbursementsByCategory(entries, categories).transport).toBe(0)
  })

  it('leaves out a reimbursement linked to a savings-funded purchase', () => {
    const entries = [
      { category_id: 'meat', type: 'reimbursement' as const, amount: 200, funding_source: 'income' as const },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 700, funding_source: 'savings' as const },
    ]

    expect(getReimbursementsByCategory(entries, categories)).toEqual({ food: 200, meat: 200, market: 0, transport: 0 })
  })

  // No backfill (ADR-006): every reimbursement that exists today is
  // funding_source 'income', so each one still widens its category's limit by
  // its full amount (the rule before ADR-006), sums exact to the cent.
  it('widens the limit for every existing reimbursement exactly as before ADR-006', () => {
    const existing = [
      { category_id: 'meat', type: 'reimbursement' as const, amount: 0.1, funding_source: 'income' as const },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 0.2, funding_source: 'income' as const },
      { category_id: 'market', type: 'reimbursement' as const, amount: 300, funding_source: 'income' as const },
      { category_id: 'transport', type: 'reimbursement' as const, amount: 40.5, funding_source: 'income' as const },
      { category_id: 'meat', type: 'expense' as const, amount: 999, funding_source: 'income' as const },
    ]

    expect(getReimbursementsByCategory(existing, categories)).toEqual({
      food: 300.3,
      meat: 0.3,
      market: 300,
      transport: 40.5,
    })
  })
})

describe('savings-funded expenses', () => {
  const entries = [
    { category_id: 'meat', type: 'expense' as const, amount: 200, funding_source: 'income' as const },
    { category_id: 'meat', type: 'expense' as const, amount: 1000, funding_source: 'savings' as const },
    { category_id: 'market', type: 'expense' as const, amount: 300, funding_source: 'savings' as const },
    { category_id: 'meat', type: 'reimbursement' as const, amount: 50, funding_source: 'income' as const },
  ]

  it('are left out of gross spend, per category and rolled up', () => {
    expect(getRawGrossSpendByCategory(entries)).toEqual({ meat: 200 })
    expect(getGrossSpendByCategory(entries, categories)).toEqual({ food: 200, meat: 200, market: 0, transport: 0 })
  })

  it('are summed separately, rolled up the same way as gross spend', () => {
    expect(getSavingsCoveredByCategory(entries, categories)).toEqual({
      food: 1300,
      meat: 1000,
      market: 300,
      transport: 0,
    })
  })

  it('do not change how reimbursements widen the limit', () => {
    expect(getReimbursementsByCategory(entries, categories)).toEqual({ food: 50, meat: 50, market: 0, transport: 0 })
  })

  it('never include income or reimbursements in the savings-covered sum', () => {
    const others = [
      { category_id: 'transport', type: 'income' as const, amount: 500, funding_source: 'savings' as const },
      { category_id: 'transport', type: 'reimbursement' as const, amount: 80, funding_source: 'savings' as const },
    ]

    expect(getSavingsCoveredByCategory(others, categories).transport).toBe(0)
  })
})

describe('buildCategoryBreakdown', () => {
  it('returns no breakdown for a category with no subcategories', () => {
    expect(buildCategoryBreakdown('transport', categories, { transport: 40 })).toEqual([])
  })

  it('breaks a parent category down by subcategory, sorted by amount descending', () => {
    const breakdown = buildCategoryBreakdown('food', categories, { meat: 150, market: 300 })

    expect(breakdown.map((item) => item.category_id)).toEqual(['market', 'meat'])
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(450)
  })

  it('zero-fills a subcategory with no spend, rather than omitting it', () => {
    const breakdown = buildCategoryBreakdown('food', categories, { meat: 150 })

    expect(breakdown.find((item) => item.category_id === 'market')?.amount).toBe(0)
  })

  it('adds an "Other" row for spend recorded directly on the parent category', () => {
    const breakdown = buildCategoryBreakdown('food', categories, { meat: 150, market: 300, food: 20 })

    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(470)
    expect(breakdown.find((item) => item.name === 'Other')?.amount).toBe(20)
  })

  it('omits the "Other" row when nothing was recorded directly on the parent', () => {
    const breakdown = buildCategoryBreakdown('food', categories, { meat: 150, market: 300 })

    expect(breakdown.find((item) => item.name === 'Other')).toBeUndefined()
  })
})

describe('getCategoryDisplayName', () => {
  const t = (key: string) => `translated:${key}`

  it('translates a seed category via its translationKey, ignoring its stored name', () => {
    expect(getCategoryDisplayName(food, t)).toBe('translated:categories:food')
  })

  it('falls back to the stored name as-is when translationKey is null', () => {
    const custom: Category = {
      id: 'custom',
      name: 'My Custom Category',
      icon: null,
      color: null,
      parent_id: null,
      translationKey: null,
    }

    expect(getCategoryDisplayName(custom, t)).toBe('My Custom Category')
  })
})

describe('exact sums', () => {
  const entry = (category_id: string, amount: number) => ({
    category_id,
    type: 'expense' as const,
    amount,
    funding_source: 'income' as const,
  })

  it('sums amounts per category without float noise', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
    expect(getRawGrossSpendByCategory([entry('meat', 0.1), entry('meat', 0.2)])).toEqual({ meat: 0.3 })
    expect(getRawGrossSpendByCategory([entry('market', 4.06), entry('market', 9.54)])).toEqual({ market: 13.6 })
  })

  it('rolls subcategories up into the parent exactly', () => {
    const totals = getGrossSpendByCategory([entry('meat', 0.1), entry('market', 0.2), entry('food', 0.7)], categories)

    expect(totals.food).toBe(1)
    expect(totals.meat).toBe(0.1)
  })

  it('gives two categories with the same decimal total strictly equal values', () => {
    const totals = getRawGrossSpendByCategory([
      entry('meat', 0.1),
      entry('meat', 0.2),
      entry('transport', 0.3),
    ])

    expect(totals.meat).toBe(totals.transport)
  })
})
