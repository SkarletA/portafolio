import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRecurringExpenses } from './useRecurringExpenses'
import { getRecurringExpenses } from '@services/recurringExpensesService'

vi.mock('@services/recurringExpensesService', () => ({
  getRecurringExpenses: vi.fn(),
}))

describe('useRecurringExpenses', () => {
  beforeEach(() => {
    vi.mocked(getRecurringExpenses).mockReset()
  })

  it('loads recurring expenses successfully', async () => {
    vi.mocked(getRecurringExpenses).mockResolvedValue({
      data: [{ id: 'r1', terms: [], occurrences: [] }],
      error: null,
    } as never)

    const { result } = renderHook(() => useRecurringExpenses())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.recurringExpenses).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getRecurringExpenses).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useRecurringExpenses())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.recurringExpenses).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears the list', async () => {
    vi.mocked(getRecurringExpenses).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useRecurringExpenses())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.recurringExpenses).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('refetch reloads the list', async () => {
    vi.mocked(getRecurringExpenses).mockResolvedValue({ data: [], error: null } as never)

    const { result } = renderHook(() => useRecurringExpenses())
    await waitFor(() => expect(result.current.loading).toBe(false))

    vi.mocked(getRecurringExpenses).mockResolvedValue({
      data: [{ id: 'r1', terms: [], occurrences: [] }],
      error: null,
    } as never)

    await result.current.refetch()

    await waitFor(() => expect(result.current.recurringExpenses).toHaveLength(1))
  })
})
