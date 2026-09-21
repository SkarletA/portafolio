import { BudgetCardBreakdown } from './BudgetCardBreakdown'

export default {
  title: 'Finora/Molecules/BudgetCardBreakdown',
  component: BudgetCardBreakdown,
  parameters: {
    docs: {
      description: {
        component:
          'A collapsible list of subcategory spend under a budget card, hidden until the user asks to see it.',
      },
    },
  },
  argTypes: {
    categoryId: {
      description: 'Used to build a stable, unique id/testid for the show/hide toggle.',
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    categoryName: {
      control: 'text',
      table: { type: { summary: 'string' } },
    },
    limit: {
      description: "The parent category's effective monthly limit, used to size each subcategory's mini progress bar.",
      control: 'number',
      table: { type: { summary: 'number' } },
    },
    items: {
      description: 'Subcategories to list once expanded; renders nothing when empty.',
      control: false,
      table: { type: { summary: 'BudgetBreakdownItem[]' } },
    },
  },
}

export const WithSubcategories = {
  args: {
    categoryId: 'food',
    categoryName: 'Food',
    limit: 500,
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
    limit: 500,
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
    limit: 200,
    items: [],
  },
}
