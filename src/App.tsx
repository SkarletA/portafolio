import { Route, Routes } from 'react-router-dom'
import { Footer } from '@portfolio-components/atoms/Footer'
import { Header } from '@portfolio-components/atoms/Header'
import { useDocumentMeta } from './hooks/useDocumentMeta'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import s from './App.module.css'

function App() {
  useDocumentMeta({
    title: 'Skarlet Araque — Building scalable, accessible, user-centered products',
    description:
      'Frontend engineer and product-minded builder with a background in e-commerce and fintech. Explore case studies, including Finora, a full-stack personal finance app.',
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
