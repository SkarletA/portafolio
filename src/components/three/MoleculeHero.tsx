import { useCallback, useState } from 'react'
import { GROUP_COLORS, GROUP_LABELS } from '@portfolio-data/groups'
import type { Group } from '@portfolio-data/groups'
import { StaticMoleculeFallback } from './StaticMoleculeFallback'
import s from './MoleculeHero.module.css'

const LEGEND_GROUPS = Object.keys(GROUP_LABELS) as Group[]

export function MoleculeHero() {
  const [compiled, setCompiled] = useState(false)

  const handleMorphClick = useCallback(() => {
    setCompiled((current) => !current)
  }, [])

  return (
    <div
      className={s.stage}
      role="img"
      aria-label="Molécula 3D interactiva donde cada átomo representa una tecnología de mi stack"
    >
      <div className={s.top}>
        <p className={s.stateLabel} data-testid="hero-molecule-state-label">
          estado: <b className={s.stateValue}>{compiled ? 'árbol de componentes' : 'molécula'}</b>
        </p>
        <button
          type="button"
          className={s.morphButton}
          onClick={handleMorphClick}
          data-testid="hero-molecule-morph-button"
        >
          {compiled ? '← Volver a molécula' : 'Compilar → árbol de componentes'}
        </button>
      </div>

      <StaticMoleculeFallback compiled={compiled} />

      <ul className={s.legend}>
        {LEGEND_GROUPS.map((group) => (
          <li key={group} className={s.legendItem}>
            <span className={s.legendDot} style={{ '--c': GROUP_COLORS[group] } as React.CSSProperties} />
            {GROUP_LABELS[group]}
          </li>
        ))}
      </ul>
    </div>
  )
}
