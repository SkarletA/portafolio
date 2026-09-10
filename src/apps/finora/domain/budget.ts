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

export function getBudgetProgress(monthlyLimit: number, spent: number): BudgetProgress {
  if (monthlyLimit <= 0) {
    return { percentage: spent > 0 ? 100 : 0, status: spent > 0 ? 'exceeded' : 'on-track' }
  }

  const percentage = (spent / monthlyLimit) * 100

  let status: BudgetStatus = 'on-track'
  if (percentage >= EXCEEDED_THRESHOLD) {
    status = 'exceeded'
  } else if (percentage >= NEAR_LIMIT_THRESHOLD) {
    status = 'near-limit'
  }

  return { percentage, status }
}
