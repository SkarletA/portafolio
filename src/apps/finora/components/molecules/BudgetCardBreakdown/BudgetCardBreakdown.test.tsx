import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BudgetCardBreakdown } from './BudgetCardBreakdown'
import type { BudgetBreakdownItem } from '../../../hooks/useBudgets'

const items: BudgetBreakdownItem[] = [
  { category_id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#2563eb', amount: 300 },
  { category_id: 'meat', name: 'Meat', icon: 'beef', color: '#7c3aed', amount: 150 },
  { category_id: 'restaurants', name: 'Restaurants', icon: 'utensils', color: '#f59e0b', amount: 0 },
]

describe('BudgetCardBreakdown', () => {
  it('renders nothing when there are no items to break down', () => {
    const { container } = render(
      <BudgetCardBreakdown categoryId="transport" categoryName="Transportation" limit={200} items={[]} />
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('shows the toggle collapsed by default with a testid derived from the category name', () => {
    render(<BudgetCardBreakdown categoryId="food" categoryName="Food" limit={500} items={items} />)

    const toggle = screen.getByTestId('budget-card-food-expand-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
  })

  it('expands to show every subcategory, including one with $0 spent, without hiding it', () => {
    render(<BudgetCardBreakdown categoryId="food" categoryName="Food" limit={500} items={items} />)

    fireEvent.click(screen.getByTestId('budget-card-food-expand-toggle'))

    expect(screen.getByText('Groceries')).toBeInTheDocument()
    expect(screen.getByText('Meat')).toBeInTheDocument()
    expect(screen.getByText('Restaurants')).toBeInTheDocument()
    expect(screen.getByText('$0')).toBeInTheDocument()

    const restaurantsRow = screen.getByText('Restaurants').closest('li')
    expect(restaurantsRow).not.toBeNull()
    expect(restaurantsRow!.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '0')
  })

  it('collapses again when the toggle is clicked a second time', () => {
    render(<BudgetCardBreakdown categoryId="food" categoryName="Food" limit={500} items={items} />)

    const toggle = screen.getByTestId('budget-card-food-expand-toggle')
    fireEvent.click(toggle)
    expect(screen.getByText('Groceries')).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
  })

  it("caps a subcategory's progress bar at 100% when it exceeds the parent budget's limit", () => {
    render(
      <BudgetCardBreakdown
        categoryId="food"
        categoryName="Food"
        limit={100}
        items={[{ category_id: 'market', name: 'Groceries', icon: null, color: null, amount: 300 }]}
      />
    )

    fireEvent.click(screen.getByTestId('budget-card-food-expand-toggle'))

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})
