export interface Budget {
  id: string
  user_id: string
  category_id: string
  monthly_limit: number
  created_at: string | null
}
