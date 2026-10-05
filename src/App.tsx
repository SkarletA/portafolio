import { Route, Routes } from 'react-router-dom'
import { Footer } from '@portfolio-components/atoms/Footer'
import { Header } from '@portfolio-components/atoms/Header'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { portfolioSeo } from './data/seo'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import s from './App.module.css'

function App() {
  useDocumentMeta({
    title: portfolioSeo.title,
    description: portfolioSeo.description,
    favicon: '/favicon.svg',
  })

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

export default App
