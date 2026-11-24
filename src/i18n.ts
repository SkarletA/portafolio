import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

export const LANGUAGE_STORAGE_KEY = 'portfolio-language'

type JsonModule = { default: Record<string, unknown> }

// Cada JSON en locales/<lng>/<namespace>.json se registra solo por existir -
// agregar una nueva sección es agregar su archivo, no tocar este archivo.
const localeModules = import.meta.glob<JsonModule>('./locales/*/*.json', { eager: true })

function loadNamespaces(lng: 'es' | 'en'): Record<string, Record<string, unknown>> {
  const namespaces: Record<string, Record<string, unknown>> = {}
  const pattern = new RegExp(`/locales/${lng}/(.+)\\.json$`)
  for (const [path, module] of Object.entries(localeModules)) {
    const match = path.match(pattern)
    if (match) namespaces[match[1]] = module.default
  }
  return namespaces
}

const esResources = loadNamespaces('es')
const enResources = loadNamespaces('en')

// Instancia propia (createInstance), separada de la de Finora
// (src/apps/finora/i18n.ts, que usa el singleton global de 'i18next'): las
// dos aplicaciones comparten runtime cuando se navega de / a /finora sin
// recargar, y llamar a .init() dos veces sobre el mismo singleton
// reconfiguraría la del otro. <I18nextProvider> en App.tsx hace que
// useTranslation() dentro del portafolio use siempre esta instancia.
export const portfolioI18n = i18next.createInstance()

portfolioI18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: esResources,
      en: enResources,
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',
    ns: Object.keys(esResources),
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default portfolioI18n
