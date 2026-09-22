import { Footer } from '@portfolio-components/atoms/Footer'
import { Header } from '@portfolio-components/atoms/Header'
import { Home } from './pages/Home'
import s from './App.module.css'

function App() {
  return (
    <div className={s.app}>
      <Header />
      <main id="main">
        <Home />
      </main>
      <Footer />
    </div>
  )
}

export default App
