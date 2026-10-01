import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBudgets } from './useBudgets'
import { getBudgets } from '@services/budgetsService'
import { getExpensesByCategory, getHouseholdContributionsByCategory } from '@services/transactionsService'
import { getCategories } from '@services/categoriesService'
import { useHousehold } from '@context/HouseholdContext'

vi.mock('../services/budgetsService', () => ({
  getBudgets: vi.fn(),
}))

vi.mock('../services/transactionsService', () => ({
  getExpensesByCategory: vi.fn(),
  getHouseholdContributionsByCategory: vi.fn(),
  getCurrentMonthRange: vi.fn(() => ({ start: '2026-09-01', end: '2026-09-30', dayOfMonth: 11 })),
}))

vi.mock('../services/categoriesService', () => ({
  getCategories: vi.fn(),
}))

vi.mock('../context/HouseholdContext', () => ({
  useHousehold: vi.fn(),
}))

const acceptedOwn = { id: 'm1', household_id: 'h1', user_id: 'u1', status: 'accepted' as const, invited_by: 'u1' }
const acceptedPartner = { id: 'm2', household_id: 'h1', user_id: 'u2', status: 'accepted' as const, invited_by: 'u1' }

describe('useBudgets', () => {
  beforeEach(() => {
    vi.mocked(getBudgets).mockReset()
    vi.mocked(getExpensesByCategory).mockReset()
    vi.mocked(getHouseholdContributionsByCategory).mockReset()
    vi.mocked(getCategories).mockReset()
    vi.mocked(getCategories).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(useHousehold).mockReturnValue({ ownMember: null, partnerMember: null } as never)
  })

  it('loads budgets successfully', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('treats an empty result as a valid, non-error state', async () => {
    vi.mocked(getBudgets).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error message and clears budgets when budgets fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('surfaces an error message and clears budgets when expenses fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('surfaces an error message and clears budgets when categories fetch fails', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({ data: null, error: { message: 'Network error' } } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([])
    expect(result.current.error).toBe('Network error')
  })

  it('combines a budget with its gross month-to-date spend and derives percentage/status against the limit', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 200 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { c1: 180 }, raw: { c1: 180 }, reimbursements: {} },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets).toEqual([
      {
        id: '1',
        category_id: 'c1',
        monthly_limit: 200,
        spent: 180,
        effectiveLimit: 200,
        coveredBySavings: 0,
        percentage: 90,
        status: 'near-limit',
        breakdown: [],
      },
    ])
  })

  it('widens the effective limit by the reimbursements recorded this period (ADR-002 worked example)', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'food', monthly_limit: 2000 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { food: 3625 },
        raw: { food: 3625 },
        reimbursements: { food: 2000 },
      },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const budget = result.current.budgets[0]
    expect(budget.spent).toBe(3625)
    expect(budget.effectiveLimit).toBe(4000)
    expect(budget.percentage).toBeCloseTo(90.625)
    expect(budget.status).toBe('near-limit')
  })

  it('reports spending covered by savings without counting it against the limit (ADR-003)', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'travel', monthly_limit: 2000 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { travel: 500 },
        raw: { travel: 500 },
        reimbursements: {},
        savingsCovered: { travel: 1666.67 },
      },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const budget = result.current.budgets[0]
    expect(budget.spent).toBe(500)
    expect(budget.coveredBySavings).toBe(1666.67)
    expect(budget.effectiveLimit).toBe(2000)
    expect(budget.percentage).toBe(25)
    expect(budget.status).toBe('on-track')
  })

  it('returns no breakdown for a category with no subcategories', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'transport', monthly_limit: 100 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { transport: 40 }, raw: { transport: 40 }, reimbursements: {} },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [{ id: 'transport', name: 'Transportation', icon: 'car', color: null, parent_id: null }],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets[0].breakdown).toEqual([])
  })

  it('breaks a parent-category budget down by subcategory, sorted by spend descending', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'food', monthly_limit: 500 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { food: 450 },
        raw: { meat: 150, market: 300, restaurants: 0 },
        reimbursements: {},
      },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [
        { id: 'food', name: 'Food', icon: 'utensils', color: '#111', parent_id: null },
        { id: 'meat', name: 'Meat', icon: 'beef', color: '#222', parent_id: 'food' },
        { id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#333', parent_id: 'food' },
        { id: 'restaurants', name: 'Restaurants', icon: 'tag', color: '#444', parent_id: 'food' },
      ],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const breakdown = result.current.budgets[0].breakdown
    expect(breakdown.map((item) => item.category_id)).toEqual(['market', 'meat', 'restaurants'])
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(450)
    expect(breakdown.find((item) => item.category_id === 'restaurants')?.amount).toBe(0)
  })

  it('adds an "Other" row for spend recorded directly on the parent category', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'food', monthly_limit: 500 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: {
        totals: { food: 470 },
        raw: { meat: 150, market: 300, food: 20 },
        reimbursements: {},
      },
      error: null,
    } as never)
    vi.mocked(getCategories).mockResolvedValue({
      data: [
        { id: 'food', name: 'Food', icon: 'utensils', color: '#111', parent_id: null },
        { id: 'meat', name: 'Meat', icon: 'beef', color: '#222', parent_id: 'food' },
        { id: 'market', name: 'Groceries', icon: 'shopping-cart', color: '#333', parent_id: 'food' },
      ],
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const breakdown = result.current.budgets[0].breakdown
    expect(breakdown.reduce((sum, item) => sum + item.amount, 0)).toBe(470)
    expect(breakdown.find((item) => item.name === 'Other')?.amount).toBe(20)
  })

  it('widens the limit by reimbursements exactly, without float noise', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 0.1 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { c1: 0.3 }, raw: {}, reimbursements: { c1: 0.2 } },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budgets[0].effectiveLimit).toBe(0.3)
    expect(result.current.budgets[0].status).toBe('exceeded')
  })

  it('shows an error and stops loading when an amount has more than 2 decimals', async () => {
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 10.005 }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: { c1: 1 } },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toMatch(/2 decimals/)
    expect(result.current.budgets).toEqual([])
  })

  it('fetches only the caller\'s own budgets and skips the household contributions call without an accepted household', async () => {
    vi.mocked(getBudgets).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)

    renderHook(() => useBudgets())

    await waitFor(() => expect(getBudgets).toHaveBeenCalledWith(undefined))
    expect(getHouseholdContributionsByCategory).not.toHaveBeenCalled()
  })

  it('widens getBudgets and fetches household contributions once both members have accepted', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getBudgets).mockResolvedValue({ data: [], error: null } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: {}, raw: {}, reimbursements: {} },
      error: null,
    } as never)
    vi.mocked(getHouseholdContributionsByCategory).mockResolvedValue({
      data: { own: {}, partner: {} },
      error: null,
    } as never)

    renderHook(() => useBudgets())

    await waitFor(() => expect(getBudgets).toHaveBeenCalledWith(['u1', 'u2']))
    expect(getHouseholdContributionsByCategory).toHaveBeenCalledWith(
      { start: '2026-09-01', end: '2026-09-30', dayOfMonth: 11 },
      { ownId: 'u1', partnerId: 'u2' }
    )
  })

  it('computes a household budget\'s spend from both members\' tagged contributions, not the blanket category total', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'rent', monthly_limit: 1000, is_household: true }],
      error: null,
    } as never)
    // An untagged personal expense inflates the blanket category total, but
    // must never count toward a household budget (ADR-010).
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { rent: 9999 }, raw: { rent: 9999 }, reimbursements: {} },
      error: null,
    } as never)
    vi.mocked(getHouseholdContributionsByCategory).mockResolvedValue({
      data: { own: { rent: 400 }, partner: { rent: 600 } },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const budget = result.current.budgets[0]
    expect(budget.spent).toBe(1000)
    expect(budget.householdContributions).toEqual({ own: 400, partner: 600 })
    expect(budget.percentage).toBe(100)
    expect(budget.status).toBe('exceeded')
  })

  it('leaves a personal budget unaffected by an active household', async () => {
    vi.mocked(useHousehold).mockReturnValue({ ownMember: acceptedOwn, partnerMember: acceptedPartner } as never)
    vi.mocked(getBudgets).mockResolvedValue({
      data: [{ id: '1', category_id: 'c1', monthly_limit: 200, is_household: false }],
      error: null,
    } as never)
    vi.mocked(getExpensesByCategory).mockResolvedValue({
      data: { totals: { c1: 180 }, raw: { c1: 180 }, reimbursements: {} },
      error: null,
    } as never)
    vi.mocked(getHouseholdContributionsByCategory).mockResolvedValue({
      data: { own: { c1: 5000 }, partner: { c1: 5000 } },
      error: null,
    } as never)

    const { result } = renderHook(() => useBudgets())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const budget = result.current.budgets[0]
    expect(budget.spent).toBe(180)
    expect(budget.householdContributions).toBeUndefined()
  })
})
