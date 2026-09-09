import { useEffect, useState } from 'react'
import { getCategories } from '../services/categoriesService'
import type { Category } from '../domain/category'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchCategories() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await getCategories()

      if (!mounted) return

      if (fetchError) {
        setError(fetchError.message)
        setCategories([])
      } else {
        setCategories((data ?? []) as Category[])
      }

      setLoading(false)
    }

    fetchCategories()

    return () => {
      mounted = false
    }
  }, [])

  return { categories, loading, error }
}
