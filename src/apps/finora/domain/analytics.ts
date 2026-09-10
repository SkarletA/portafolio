export function getSavingsRate(totalIncome: number, totalSpent: number): number {
  if (totalIncome <= 0) return 0
  return ((totalIncome - totalSpent) / totalIncome) * 100
}

export function getAveragePerDay(totalSpent: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0
  return totalSpent / daysElapsed
}

export function getCategoryPercentage(amount: number, total: number): number {
  if (total <= 0) return 0
  return (amount / total) * 100
}
