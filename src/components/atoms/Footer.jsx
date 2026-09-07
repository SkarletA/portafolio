export function Footer() {
  return (
    <footer className="border-t border-paper/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-paper-muted md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} Skarlet Araque</p>
        <p>Built with React, Vite and Tailwind CSS.</p>
      </div>
    </footer>
  )
}
