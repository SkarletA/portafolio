export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  created_at: string | null
}

export interface GoalProgress {
  percentage: number
  remaining: number
}

export function getGoalProgress(current: number, target: number): GoalProgress {
  if (target <= 0) {
    return { percentage: current > 0 ? 100 : 0, remaining: 0 }
  }

  return {
    percentage: (current / target) * 100,
    remaining: Math.max(target - current, 0),
  }
}
