import { Footer } from './components/atoms/Footer'
import { Header } from './components/atoms/Header'
import { Home } from './pages/Home'

function App() {
  return (
    <div className="min-h-svh">
      <Header />
      <main id="main">
        <Home />
      </main>
      <Footer />
    </div>
  )
}

export default App
