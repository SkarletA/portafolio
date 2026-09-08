import { Link } from 'react-router-dom'
import { Button } from '../components/atoms/Button/Button'
import s from './Dashboard.module.css'

export function Dashboard() {
  return (
    <section className={s.section}>
      <p className={s.eyebrow}>Finora</p>
      <h1 className={s.title}>Personal finance, coming together</h1>
      <p className={s.subtitle}>
        Finora is being built as a real product inside this portfolio — expense tracking, budgets, and insights are
        on the way.
      </p>
      <div className={s.actions}>
        <Button id="dashboard-get-notified-button" data-testid="dashboard-get-notified-button">
          Get notified
        </Button>
        <Link to="/finora/transactions" className={s.link} data-testid="dashboard-transactions-link">
          View transactions
        </Link>
      </div>
    </section>
  )
}
