import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useProfile } from '../hooks/useProfile'
import { updateCurrency } from '../services/profilesService'
import type { Currency } from '../domain/profile'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const [currency, setCurrencyState] = useState<Currency>('MXN')

  // Adopts the saved currency once the profile loads, so a returning user's
  // preference is applied without them re-selecting it.
  useEffect(() => {
    if (!profile) return
    setCurrencyState(profile.currency)
  }, [profile])

  const setCurrency = useCallback((nextCurrency: Currency) => {
    setCurrencyState(nextCurrency)
    // Persisted in the background - the switch already feels instant via the
    // state update above, and a failed save here isn't worth blocking on or
    // surfacing loudly.
    updateCurrency(nextCurrency).catch((error: unknown) => {
      console.error('Failed to persist currency preference', error)
    })
  }, [])

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
