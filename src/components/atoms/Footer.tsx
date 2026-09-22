import s from './Footer.module.css'

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <p>© {new Date().getFullYear()} Skarlet Araque</p>
        <p>Built with React, Vite and Tailwind CSS.</p>
      </div>
    </footer>
  )
}
