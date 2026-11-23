import s from './Footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <p>© {new Date().getFullYear()} Skarlet Araque</p>
        <p>Hecho con React, mucha química y three.js.</p>
      </div>
    </footer>
  )
}
