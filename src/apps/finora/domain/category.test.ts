import { describe, expect, it } from 'vitest'
import {
  buildCategoryTree,
  getCategoryIdsForRollup,
  getNetSpendByCategory,
  getRawNetSpendByCategory,
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

describe('getRawNetSpendByCategory', () => {
  it('sums net spend per category without rolling children into their parent', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50 },
      { category_id: 'market', type: 'expense' as const, amount: 300 },
      { category_id: 'food', type: 'expense' as const, amount: 20 },
    ]

    expect(getRawNetSpendByCategory(entries)).toEqual({
      meat: 150,
      market: 300,
      food: 20,
    })
  })

  it('ignores entries with no category and entries of type income', () => {
    const entries = [
      { category_id: null, type: 'expense' as const, amount: 999 },
      { category_id: 'transport', type: 'income' as const, amount: 500 },
      { category_id: 'transport', type: 'expense' as const, amount: 40 },
    ]

    expect(getRawNetSpendByCategory(entries)).toEqual({ transport: 40 })
  })

  it('does not clamp negative net spend (a category can show a net reimbursement)', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 100 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 300 },
    ]

    expect(getRawNetSpendByCategory(entries)).toEqual({ meat: -200 })
  })
})

describe('getNetSpendByCategory', () => {
  it('rolls up subcategory net spend into the parent without double counting', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 50 },
      { category_id: 'market', type: 'expense' as const, amount: 300 },
      { category_id: 'transport', type: 'expense' as const, amount: 100 },
    ]

    expect(getNetSpendByCategory(entries, categories)).toEqual({
      food: 450,
      meat: 150,
      market: 300,
      transport: 100,
    })
  })

  it('clamps a rollup at 0 once, after summing across the whole scope, instead of clamping each child first', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 100 },
      { category_id: 'meat', type: 'reimbursement' as const, amount: 300 },
      { category_id: 'market', type: 'expense' as const, amount: 50 },
    ]

    const result = getNetSpendByCategory(entries, categories)

    expect(result.food).toBe(0)
    expect(result.meat).toBe(0)
    expect(result.market).toBe(50)
  })

  it('ignores entries with no category and entries of type income', () => {
    const entries = [
      { category_id: null, type: 'expense' as const, amount: 999 },
      { category_id: 'transport', type: 'income' as const, amount: 500 },
      { category_id: 'transport', type: 'expense' as const, amount: 40 },
    ]

    expect(getNetSpendByCategory(entries, categories).transport).toBe(40)
  })

  it('does not roll a budget on a specific subcategory up to its sibling', () => {
    const entries = [
      { category_id: 'meat', type: 'expense' as const, amount: 200 },
      { category_id: 'market', type: 'expense' as const, amount: 9000 },
    ]

    expect(getNetSpendByCategory(entries, categories).meat).toBe(200)
  })
})
