import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import i18n from '../i18n'
import { useProfile } from '@hooks/useProfile'
import { updateLanguage } from '@services/profilesService'
import type { Language } from '@domain/profile'

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

function currentDetectedLanguage(): Language {
  return i18n.language?.startsWith('es') ? 'es' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const [language, setLanguageState] = useState<Language>(currentDetectedLanguage)

  // Adopts the saved language once the profile loads, so it takes priority
  // over whatever the browser-detector guessed before there was a session.
  useEffect(() => {
    if (!profile) return
    setLanguageState(profile.language)
    i18n.changeLanguage(profile.language)
  }, [profile])

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage)
    i18n.changeLanguage(nextLanguage)
    // Persisted in the background - the switch already feels instant via the
    // state/i18n update above, and a failed save here isn't worth blocking
    // on or surfacing loudly.
    updateLanguage(nextLanguage).catch((error: unknown) => {
      console.error('Failed to persist language preference', error)
    })
  }, [])

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
