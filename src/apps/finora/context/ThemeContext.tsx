import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useProfile } from '../hooks/useProfile'
import { updateTheme } from '../services/profilesService'
import type { Theme } from '../domain/profile'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const THEME_STORAGE_KEY = 'finora-theme'

// A per-browser fast-path cache, not the source of truth (profiles.theme
// is) - only used so the first paint can already guess a returning user's
// theme instead of always flashing light before their profile loads. If two
// different accounts share a browser, the cache can briefly show the wrong
// one's theme until the real profile resolves and overwrites it.
function readCachedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function writeCachedTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Best-effort only - falling back to the flash-of-light-mode this cache
    // exists to avoid is fine if storage is unavailable (private browsing).
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile()
  const [theme, setThemeState] = useState<Theme>(readCachedTheme)

  // Adopts the saved theme once the profile loads, so a returning user's
  // dark-mode preference is applied without them re-selecting it, and keeps
  // the local cache in sync with the real source of truth.
  useEffect(() => {
    if (!profile) return
    setThemeState(profile.theme)
    writeCachedTheme(profile.theme)
  }, [profile])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    writeCachedTheme(nextTheme)
    // Persisted in the background - the toggle already feels instant via the
    // state update above, and a failed save here isn't worth blocking on or
    // surfacing loudly.
    updateTheme(nextTheme).catch((error: unknown) => {
      console.error('Failed to persist theme preference', error)
    })
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
