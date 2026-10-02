import { Link } from 'react-router-dom'
import s from './NotFound.module.css'

export function NotFound() {
  return (
    <section className={s.section}>
      <p className={s.code}>404</p>
      <h1 className={s.title}>Page not found</h1>
      <p className={s.description}>The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className={s.button} data-testid="not-found-home-link">
        Back to home
      </Link>
    </section>
  )
}
