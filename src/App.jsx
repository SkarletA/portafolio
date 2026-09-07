import { Footer } from './components/Footer'
import { Header } from './components/Header'
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
