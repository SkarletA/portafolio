import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@context/AuthContext'
import {
  acceptHouseholdInvite,
  declineHouseholdInvite,
  getHouseholdMembers,
  getHouseholdPartner,
  inviteHouseholdMember,
  leaveHousehold,
} from '@services/householdsService'
import { parseHouseholdError, type HouseholdErrorCode } from '@services/householdErrors'
import type { HouseholdMember, HouseholdPartner } from '@domain/household'

// 'generic' covers an RPC failure that isn't one of the known codes (e.g. a
// network error), so a failed action always has something to show instead
// of silently doing nothing.
export type HouseholdActionError = HouseholdErrorCode | 'generic'

interface HouseholdContextValue {
  // My own membership row: null outside a household, 'pending' while I'm the
  // invitee awaiting my own decision, 'accepted' once I'm in.
  ownMember: HouseholdMember | null
  // The other member's row: present once I've invited someone or I've
  // accepted someone else's invite, whatever their status.
  partnerMember: HouseholdMember | null
  partner: HouseholdPartner | null
  loading: boolean
  error: string | null
  actionPending: boolean
  actionError: HouseholdActionError | null
  invite: (email: string) => Promise<boolean>
  accept: () => Promise<boolean>
  decline: () => Promise<boolean>
  leave: () => Promise<boolean>
  refetch: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined)

// One shared instance for the whole app (mounted once in FinoraApp, above
// AppShell), not a plain hook: AppShell's pending-invite banner and
// Settings' Household block would otherwise each hold their own copy of
// this state, so accepting/declining/leaving from one would not clear the
// other's view of it until a full reload.
export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ownMember, setOwnMember] = useState<HouseholdMember | null>(null)
  const [partnerMember, setPartnerMember] = useState<HouseholdMember | null>(null)
  const [partner, setPartner] = useState<HouseholdPartner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<HouseholdActionError | null>(null)
  const mountedRef = useRef(true)

  const refetch = useCallback(async () => {
    if (!user) {
      setOwnMember(null)
      setPartnerMember(null)
      setPartner(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [membersResult, partnerResult] = await Promise.all([getHouseholdMembers(), getHouseholdPartner()])

    if (!mountedRef.current) return

    if (membersResult.error) {
      setError(membersResult.error.message)
      setOwnMember(null)
      setPartnerMember(null)
      setPartner(null)
      setLoading(false)
      return
    }

    const members = (membersResult.data ?? []) as HouseholdMember[]
    setOwnMember(members.find((member) => member.user_id === user.id) ?? null)
    setPartnerMember(members.find((member) => member.user_id !== user.id) ?? null)
    setPartner(partnerResult.error ? null : (partnerResult.data as HouseholdPartner | null))
    setLoading(false)
  }, [user])

  useEffect(() => {
    mountedRef.current = true
    refetch()

    return () => {
      mountedRef.current = false
    }
  }, [refetch])

  const invite = useCallback(
    async (email: string) => {
      setActionPending(true)
      setActionError(null)

      const { error: rpcError } = await inviteHouseholdMember(email)

      if (rpcError) {
        setActionPending(false)
        setActionError(parseHouseholdError(rpcError) ?? 'generic')
        return false
      }

      await refetch()
      setActionPending(false)
      return true
    },
    [refetch]
  )

  const accept = useCallback(async () => {
    setActionPending(true)
    setActionError(null)

    const { error: rpcError } = await acceptHouseholdInvite()

    if (rpcError) {
      setActionPending(false)
      setActionError(parseHouseholdError(rpcError) ?? 'generic')
      return false
    }

    await refetch()
    setActionPending(false)
    return true
  }, [refetch])

  const decline = useCallback(async () => {
    setActionPending(true)
    setActionError(null)

    const { error: rpcError } = await declineHouseholdInvite()

    if (rpcError) {
      setActionPending(false)
      setActionError(parseHouseholdError(rpcError) ?? 'generic')
      return false
    }

    await refetch()
    setActionPending(false)
    return true
  }, [refetch])

  const leave = useCallback(async () => {
    setActionPending(true)
    setActionError(null)

    const { error: rpcError } = await leaveHousehold()

    if (rpcError) {
      setActionPending(false)
      setActionError(parseHouseholdError(rpcError) ?? 'generic')
      return false
    }

    await refetch()
    setActionPending(false)
    return true
  }, [refetch])

  const value: HouseholdContextValue = {
    ownMember,
    partnerMember,
    partner,
    loading,
    error,
    actionPending,
    actionError,
    invite,
    accept,
    decline,
    leave,
    refetch,
  }

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider')
  }
  return context
}
