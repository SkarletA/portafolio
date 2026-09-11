import { BudgetCardBreakdown } from './BudgetCardBreakdown'

export default {
  title: 'Finora/Molecules/BudgetCardBreakdown',
  component: BudgetCardBreakdown,
}

export const WithSubcategories = {
  args: {
    categoryId: 'food',
    categoryName: 'Food',
    monthlyLimit: 500,
    items: [
      { category_id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#2563eb', amount: 300 },
      { category_id: 'meat', name: 'Meat', icon: 'beef', color: '#7c3aed', amount: 150 },
      { category_id: 'restaurants', name: 'Restaurants', icon: 'utensils', color: '#f59e0b', amount: 0 },
    ],
  },
}

export const WithDirectSpend = {
  args: {
    categoryId: 'food',
    categoryName: 'Food',
    monthlyLimit: 500,
    items: [
      { category_id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#2563eb', amount: 300 },
      { category_id: 'meat', name: 'Meat', icon: 'beef', color: '#7c3aed', amount: 150 },
      { category_id: 'food:other', name: 'Other', icon: null, color: null, amount: 20 },
    ],
  },
}

export const NoSubcategories = {
  args: {
    categoryId: 'transport',
    categoryName: 'Transportation',
    monthlyLimit: 200,
    items: [],
  },
}
