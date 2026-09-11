import { describe, expect, it } from 'vitest'
import { getBudgetProgress } from './budget'

describe('getBudgetProgress', () => {
  it('computes the percentage of the limit spent and an on-track status well under it', () => {
    expect(getBudgetProgress(400, 120)).toEqual({ percentage: 30, status: 'on-track' })
  })

  it('flags near-limit at the 80% threshold', () => {
    expect(getBudgetProgress(200, 160)).toEqual({ percentage: 80, status: 'near-limit' })
  })

  it('flags exceeded at the 100% threshold', () => {
    expect(getBudgetProgress(200, 200)).toEqual({ percentage: 100, status: 'exceeded' })
  })

  it('can exceed 100% when spend goes past the limit', () => {
    expect(getBudgetProgress(200, 300)).toEqual({ percentage: 150, status: 'exceeded' })
  })

  it('treats a limit of 0 with no spend as on-track', () => {
    expect(getBudgetProgress(0, 0)).toEqual({ percentage: 0, status: 'on-track' })
  })

  it('treats a limit of 0 with any spend as exceeded', () => {
    expect(getBudgetProgress(0, 50)).toEqual({ percentage: 100, status: 'exceeded' })
  })

  // A budget with a nominal $0 monthly_limit but a reimbursement posted this
  // period gets a positive effectiveLimit from the caller (monthly_limit +
  // reimbursements) - see docs/adr/002-gross-spend-and-effective-limit.md.
  // getBudgetProgress itself only ever sees "a limit", so this is really just
  // the normal, non-zero-limit path, exercised with that scenario's numbers.
  it("computes normally against an effectiveLimit widened by a reimbursement, even when monthly_limit was 0", () => {
    const effectiveLimit = 0 + 500 // monthly_limit (0) + reimbursements (500)
    expect(getBudgetProgress(effectiveLimit, 100)).toEqual({ percentage: 20, status: 'on-track' })
  })

  it('matches the ADR-002 worked example: $2,000 limit widened to $4,000 by a $2,000 reimbursement, $3,625 gross spent', () => {
    const effectiveLimit = 2000 + 2000
    const result = getBudgetProgress(effectiveLimit, 3625)
    expect(result.percentage).toBeCloseTo(90.625)
    expect(result.status).toBe('near-limit')
  })
})
