import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { I18nextProvider, useTranslation } from 'react-i18next'
import { Footer } from '@portfolio-components/atoms/Footer'
import { Header } from '@portfolio-components/atoms/Header'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { portfolioSeo } from './data/seo'
import { portfolioI18n } from './i18n'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import s from './App.module.css'

function AppShell() {
  const { i18n } = useTranslation()

  useDocumentMeta({
    title: portfolioSeo.title,
    description: portfolioSeo.description,
    favicon: '/favicon.svg',
  })

  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <div className={s.app}>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <I18nextProvider i18n={portfolioI18n}>
      <AppShell />
    </I18nextProvider>
  )
}

export default App
