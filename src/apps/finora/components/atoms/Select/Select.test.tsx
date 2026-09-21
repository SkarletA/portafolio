import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing', disabled: true },
]

describe('Select', () => {
  it('shows the placeholder when no option is selected', () => {
    render(<Select options={options} value="" onChange={vi.fn()} placeholder="Select a category" testId="cat" />)

    expect(screen.getByTestId('cat-trigger')).toHaveTextContent('Select a category')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the selected option label', () => {
    render(<Select options={options} value="food" onChange={vi.fn()} testId="cat" />)

    expect(screen.getByTestId('cat-trigger')).toHaveTextContent('Food')
  })

  it('opens on click and calls onChange with the clicked option', () => {
    const onChange = vi.fn()
    render(<Select options={options} value="" onChange={onChange} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('cat-option-transport'))
    expect(onChange).toHaveBeenCalledWith('transport')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not select a disabled option', () => {
    const onChange = vi.fn()
    render(<Select options={options} value="" onChange={onChange} testId="cat" />)

    fireEvent.click(screen.getByTestId('cat-trigger'))
    fireEvent.click(screen.getByTestId('cat-option-housing'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('opens and moves focus into the options on ArrowDown from the trigger', () => {
    render(<Select options={options} value="" onChange={vi.fn()} testId="cat" />)

    fireEvent.keyDown(screen.getByTestId('cat-trigger'), { key: 'ArrowDown' })

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByTestId('cat-option-food')).toHaveFocus()
  })

  it('navigates with arrow keys and selects the active option with Enter', () => {
    const onChange = vi.fn()
    render(<Select options={options} value="" onChange={onChange} testId="cat" />)

    fireEvent.keyDown(screen.getByTestId('cat-trigger'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    expect(screen.getByTestId('cat-option-transport')).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('transport')
    expect(screen.getByTestId('cat-trigger')).toHaveFocus()
  })

  it('closes without changing the value on Escape and returns focus to the trigger', () => {
    const onChange = vi.fn()
    render(<Select options={options} value="food" onChange={onChange} testId="cat" />)

    fireEvent.keyDown(screen.getByTestId('cat-trigger'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByTestId('cat-trigger')).toHaveFocus()
  })

  it('closes when clicking outside', () => {
    render(
      <div>
        <Select options={options} value="" onChange={vi.fn()} testId="cat" />
        <button type="button">outside</button>
      </div>
    )

    fireEvent.click(screen.getByTestId('cat-trigger'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not open when disabled', () => {
    render(<Select options={options} value="" onChange={vi.fn()} testId="cat" disabled />)

    fireEvent.click(screen.getByTestId('cat-trigger'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
