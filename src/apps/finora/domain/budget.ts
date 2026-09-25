import { sumToMinorUnits } from './money'

export interface Budget {
  id: string
  user_id: string
  category_id: string
  monthly_limit: number
  created_at: string | null
}

export type BudgetStatus = 'on-track' | 'near-limit' | 'exceeded'

export interface BudgetProgress {
  percentage: number
  status: BudgetStatus
}

const NEAR_LIMIT_THRESHOLD = 80
const EXCEEDED_THRESHOLD = 100

// `monthlyLimit` and `spent` are sums computed in JavaScript, so both are taken
// to cents before deciding the status: a spend that lands exactly on 80% or
// 100% of the limit must not fall on the wrong side because of float noise
// (0.7 + 0.1 is 0.7999999999999999). See docs/adr/005-money-arithmetic-in-the-client.md.
export function getBudgetProgress(monthlyLimit: number, spent: number): BudgetProgress {
  const limitCents = sumToMinorUnits(monthlyLimit)
  const spentCents = sumToMinorUnits(spent)

  if (limitCents <= 0) {
    return { percentage: spentCents > 0 ? 100 : 0, status: spentCents > 0 ? 'exceeded' : 'on-track' }
  }

  const percentage = (spentCents / limitCents) * 100

  let status: BudgetStatus = 'on-track'
  if (spentCents * 100 >= limitCents * EXCEEDED_THRESHOLD) {
    status = 'exceeded'
  } else if (spentCents * 100 >= limitCents * NEAR_LIMIT_THRESHOLD) {
    status = 'near-limit'
  }

  return { percentage, status }
}
