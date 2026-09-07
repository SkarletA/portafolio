export function Button({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-finora-accent text-finora-bg hover:opacity-90',
    secondary: 'border border-finora-ink/20 text-finora-ink hover:bg-finora-ink/5',
  }

  return (
    <button
      type="button"
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${variants[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}
