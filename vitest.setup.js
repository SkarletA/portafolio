import { afterEach, expect, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

// Global react-i18next mock: t() returns the translation key itself (plus
// any interpolation values, stringified) instead of a real translation, so
// component tests assert against a stable key rather than visible text that
// would otherwise depend on the active language. The namespace argument to
// useTranslation() is intentionally ignored - the mock doesn't need to know
// which file a key would have come from.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      if (options && typeof options === 'object' && Object.keys(options).length > 0) {
        return `${key}:${JSON.stringify(options)}`
      }
      return key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
