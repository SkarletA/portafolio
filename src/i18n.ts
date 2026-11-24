import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import enCommon from './locales/en/common.json'
import enLab from './locales/en/lab.json'
import enLaboratoria from './locales/en/laboratoria.json'
import esCommon from './locales/es/common.json'
import esLab from './locales/es/lab.json'
import esLaboratoria from './locales/es/laboratoria.json'

export const LANGUAGE_STORAGE_KEY = 'portfolio-language'

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
      es: { common: esCommon, lab: esLab, laboratoria: esLaboratoria },
      en: { common: enCommon, lab: enLab, laboratoria: enLaboratoria },
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',
    ns: ['common', 'lab', 'laboratoria'],
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
