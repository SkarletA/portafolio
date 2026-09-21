import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProfile } from '@services/profilesService'
import type { Profile } from '@domain/profile'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error } = await getProfile(user.id)

    if (!mountedRef.current) return

    if (error) {
      setError(error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  return { profile, loading, error, refetch }
}
