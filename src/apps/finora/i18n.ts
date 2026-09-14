import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enCategories from './locales/en/categories.json'
import enDashboard from './locales/en/dashboard.json'
import enTransactions from './locales/en/transactions.json'
import enBudgets from './locales/en/budgets.json'
import enAnalytics from './locales/en/analytics.json'
import enGoals from './locales/en/goals.json'
import enSettings from './locales/en/settings.json'

import esCommon from './locales/es/common.json'
import esAuth from './locales/es/auth.json'
import esCategories from './locales/es/categories.json'
import esDashboard from './locales/es/dashboard.json'
import esTransactions from './locales/es/transactions.json'
import esBudgets from './locales/es/budgets.json'
import esAnalytics from './locales/es/analytics.json'
import esGoals from './locales/es/goals.json'
import esSettings from './locales/es/settings.json'

export const LANGUAGE_STORAGE_KEY = 'finora-language'

// Detects the browser's language before there's a session (for Login/
// Register), caching the pick in localStorage so it's consistent across
// reloads. Once a profile loads, LanguageContext calls i18n.changeLanguage()
// with profiles.language, which takes priority over this detection.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        categories: enCategories,
        dashboard: enDashboard,
        transactions: enTransactions,
        budgets: enBudgets,
        analytics: enAnalytics,
        goals: enGoals,
        settings: enSettings,
      },
      es: {
        common: esCommon,
        auth: esAuth,
        categories: esCategories,
        dashboard: esDashboard,
        transactions: esTransactions,
        budgets: esBudgets,
        analytics: esAnalytics,
        goals: esGoals,
        settings: esSettings,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'categories', 'dashboard', 'transactions', 'budgets', 'analytics', 'goals', 'settings'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
