import { describe, expect, it } from 'vitest'
import {
  buildCategoryTree,
  getCategoryIdsForRollup,
  getGrossSpendByCategory,
  getRawGrossSpendByCategory,
  getReimbursementsByCategory,
  type Category,
} from './category'

const food: Category = { id: 'food', name: 'Food', icon: 'utensils', color: null, parent_id: null }
const meat: Category = { id: 'meat', name: 'Carne', icon: 'beef', color: null, parent_id: 'food' }
const market: Category = { id: 'market', name: 'Mercado', icon: 'shopping-cart', color: null, parent_id: 'food' }
const transport: Category = { id: 'transport', name: 'Transportation', icon: 'car', color: null, parent_id: null }

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
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50 },
      { category_id: 'market', type: 'expense' as const, amount: 300 },
      { category_id: 'food', type: 'expense' as const, amount: 20 },
    ]

    expect(getRawGrossSpendByCategory(entries)).toEqual({
      meat: 200,
      market: 300,
      food: 20,
    })
  })

  it('ignores entries with no category, income entries, and reimbursement entries', () => {
    const entries = [
      { category_id: null, type: 'expense' as const, amount: 999 },
      { category_id: 'transport', type: 'income' as const, amount: 500 },
      { category_id: 'transport', type: 'reimbursement' as const, amount: 300 },
      { category_id: 'transport', type: 'expense' as const, amount: 40 },
    ]

    expect(getRawGrossSpendByCategory(entries)).toEqual({ transport: 40 })
  })
})

describe('getGrossSpendByCategory', () => {
  it('rolls up subcategory expenses into the parent without double counting', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50 },
      { category_id: 'market', type: 'expense' as const, amount: 300 },
      { category_id: 'transport', type: 'expense' as const, amount: 100 },
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
      { category_id: 'meat', type: 'expense' as const, amount: 100 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 300 },
      { category_id: 'market', type: 'expense' as const, amount: 50 },
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
      { category_id: null, type: 'expense' as const, amount: 999 },
      { category_id: 'transport', type: 'income' as const, amount: 500 },
      { category_id: 'transport', type: 'expense' as const, amount: 40 },
    ]

    expect(getGrossSpendByCategory(entries, categories).transport).toBe(40)
  })

  it('does not roll a budget on a specific subcategory up to its sibling', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'market', type: 'expense' as const, amount: 9000 },
    ]

    expect(getGrossSpendByCategory(entries, categories).meat).toBe(200)
  })
})

describe('getReimbursementsByCategory', () => {
  it('rolls up subcategory reimbursements into the parent', () => {
    const entries = [
      { category_id: 'meat', type: 'reimbursement' as const, amount: 200 },
      { category_id: 'market', type: 'reimbursement' as const, amount: 300 },
      { category_id: 'meat', type: 'expense' as const, amount: 999 },
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
      { category_id: 'transport', type: 'expense' as const, amount: 40 },
      { category_id: 'transport', type: 'income' as const, amount: 500 },
    ]

    expect(getReimbursementsByCategory(entries, categories).transport).toBe(0)
  })
})
