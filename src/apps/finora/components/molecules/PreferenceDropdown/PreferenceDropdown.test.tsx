import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PreferenceDropdown } from './PreferenceDropdown'

const options = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
]

describe('PreferenceDropdown', () => {
  it('shows the current value and hides the option list until opened', () => {
    render(
      <PreferenceDropdown
        icon={<span />}
        label="Language"
        value="en"
        options={options}
        onSelect={vi.fn()}
        testId="test-language"
      />
    )

    expect(screen.getByTestId('test-language-toggle')).toHaveTextContent('EN')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens the option list on click and calls onSelect with the chosen value', () => {
    const onSelect = vi.fn()
    render(
      <PreferenceDropdown
        icon={<span />}
        label="Language"
        value="en"
        options={options}
        onSelect={onSelect}
        testId="test-language"
      />
    )

    fireEvent.click(screen.getByTestId('test-language-toggle'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('test-language-option-es'))
    expect(onSelect).toHaveBeenCalledWith('es')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes when clicking outside the dropdown', () => {
    render(
      <div>
        <PreferenceDropdown
          icon={<span />}
          label="Language"
          value="en"
          options={options}
          onSelect={vi.fn()}
          testId="test-language"
        />
        <button type="button">outside</button>
      </div>
    )

    fireEvent.click(screen.getByTestId('test-language-toggle'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape', () => {
    render(
      <PreferenceDropdown
        icon={<span />}
        label="Language"
        value="en"
        options={options}
        onSelect={vi.fn()}
        testId="test-language"
      />
    )

    fireEvent.click(screen.getByTestId('test-language-toggle'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
