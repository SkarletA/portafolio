import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient'
import * as authService from '../services/authService'
import { toAuthUser, type AuthUser } from '../domain/auth'

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signIn: typeof authService.signIn
  signUp: typeof authService.signUp
  signOut: typeof authService.signOut
  requestPasswordReset: typeof authService.requestPasswordReset
  updatePassword: typeof authService.updatePassword
  changePassword: typeof authService.changePassword
  updateProfile: typeof authService.updateProfile
  updateEmail: typeof authService.updateEmail
  uploadAvatar: typeof authService.uploadAvatar
  deleteAccount: typeof authService.deleteAccount
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    authService.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(toAuthUser(data.session?.user))
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(toAuthUser(newSession?.user))
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signIn: authService.signIn,
    signUp: authService.signUp,
    signOut: authService.signOut,
    requestPasswordReset: authService.requestPasswordReset,
    updatePassword: authService.updatePassword,
    changePassword: authService.changePassword,
    updateProfile: authService.updateProfile,
    updateEmail: authService.updateEmail,
    uploadAvatar: authService.uploadAvatar,
    deleteAccount: authService.deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
