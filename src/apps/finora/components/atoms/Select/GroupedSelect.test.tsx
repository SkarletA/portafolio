import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GroupedSelect } from './GroupedSelect'

const groups = [
  {
    value: 'food',
    label: 'Food',
    children: [
      { value: 'meat', label: 'Meat' },
      { value: 'groceries', label: 'Groceries' },
    ],
  },
  {
    value: 'housing',
    label: 'Housing',
    children: [],
  },
]

describe('GroupedSelect', () => {
  it('renders each group header and its indented children', () => {
    render(<GroupedSelect groups={groups} value="" onChange={vi.fn()} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))

    expect(screen.getByTestId('cat-option-food')).toBeInTheDocument()
    expect(screen.getByTestId('cat-option-meat')).toBeInTheDocument()
    expect(screen.getByTestId('cat-option-groceries')).toBeInTheDocument()
  })

  it('collapses a group with no children to just its header option', () => {
    render(<GroupedSelect groups={groups} value="" onChange={vi.fn()} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))

    expect(screen.getByTestId('cat-option-housing')).toBeInTheDocument()
    expect(screen.queryByTestId('cat-option-housing-child')).not.toBeInTheDocument()
  })

  it('selects a group header (parent category) directly', () => {
    const onChange = vi.fn()
    render(<GroupedSelect groups={groups} value="" onChange={onChange} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))
    fireEvent.click(screen.getByTestId('cat-option-food'))

    expect(onChange).toHaveBeenCalledWith('food')
  })

  it('selects a child (subcategory) option', () => {
    const onChange = vi.fn()
    render(<GroupedSelect groups={groups} value="" onChange={onChange} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))
    fireEvent.click(screen.getByTestId('cat-option-meat'))

    expect(onChange).toHaveBeenCalledWith('meat')
  })

  it('shows the selected child label on the trigger', () => {
    render(<GroupedSelect groups={groups} value="meat" onChange={vi.fn()} testId="cat" />)

    expect(screen.getByTestId('cat-trigger')).toHaveTextContent('Meat')
  })

  it('renders the special option after a separator and selecting it calls onChange', () => {
    const onChange = vi.fn()
    render(
      <GroupedSelect
        groups={groups}
        value=""
        onChange={onChange}
        testId="cat"
        specialOption={{ value: '__create__', label: 'Create new category' }}
      />
    )

    fireEvent.click(screen.getByTestId('cat-trigger'))

    expect(screen.getByRole('separator')).toBeInTheDocument()
    const specialOption = screen.getByTestId('cat-option-__create__')
    expect(specialOption).toHaveTextContent('Create new category')

    fireEvent.click(specialOption)
    expect(onChange).toHaveBeenCalledWith('__create__')
  })

  it('does not render a special option or separator when none is given', () => {
    render(<GroupedSelect groups={groups} value="" onChange={vi.fn()} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))

    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('navigates across group boundaries with arrow keys', () => {
    render(<GroupedSelect groups={groups} value="" onChange={vi.fn()} testId="cat" />)

    fireEvent.keyDown(screen.getByTestId('cat-trigger'), { key: 'ArrowDown' })
    expect(screen.getByTestId('cat-option-food')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    expect(screen.getByTestId('cat-option-meat')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    expect(screen.getByTestId('cat-option-groceries')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    expect(screen.getByTestId('cat-option-housing')).toHaveFocus()
  })
})
