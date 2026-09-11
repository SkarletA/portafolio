import { useCallback, useEffect, useRef, useState } from 'react'
import { getCategories } from '../services/categoriesService'
import type { Category } from '../domain/category'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await getCategories()

    if (!mountedRef.current) return

    if (fetchError) {
      setError(fetchError.message)
      setCategories([])
    } else {
      setCategories((data ?? []) as Category[])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { categories, loading, error, refetch }
}
