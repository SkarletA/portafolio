import { useCallback, useRef, useState } from 'react'
import { GROUP_COLORS, GROUP_LABELS } from '@portfolio-data/groups'
import type { Group } from '@portfolio-data/groups'
import { StaticMoleculeFallback } from './StaticMoleculeFallback'
import { useMoleculeScene } from './useMoleculeScene'
import { isWebglSupported } from './webglSupport'
import s from './MoleculeHero.module.css'

const LEGEND_GROUPS = Object.keys(GROUP_LABELS) as Group[]
const ACCESSIBLE_NAME = 'Molécula 3D interactiva donde cada átomo representa una tecnología de mi stack'

export function MoleculeHero() {
  const [compiled, setCompiled] = useState(false)
  const [hintVisible, setHintVisible] = useState(true)
  const [webglSupported] = useState(isWebglSupported)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const tooltipTitleRef = useRef<HTMLElement | null>(null)
  const tooltipDescriptionRef = useRef<HTMLElement | null>(null)

  const handleMorphClick = useCallback(() => {
    setCompiled((current) => !current)
  }, [])

  const handleInteractionStart = useCallback(() => {
    setHintVisible(false)
  }, [])

  const { contextLost } = useMoleculeScene({
    enabled: webglSupported,
    canvasRef,
    containerRef,
    compiled,
    tooltip: { containerRef: tooltipRef, titleRef: tooltipTitleRef, descriptionRef: tooltipDescriptionRef },
    onInteractionStart: handleInteractionStart,
  })

  const showFallback = !webglSupported || contextLost

  return (
    <div ref={containerRef} className={s.stage} role="img" aria-label={ACCESSIBLE_NAME}>
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

      {webglSupported ? (
        <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" />
      ) : null}
      {showFallback ? (
        <div className={s.fallback}>
          <StaticMoleculeFallback compiled={compiled} />
        </div>
      ) : null}

      {!showFallback ? (
        <div ref={tooltipRef} className={s.tooltip} data-testid="hero-molecule-tooltip">
          <strong ref={tooltipTitleRef} className={s.tooltipTitle} />
          <span ref={tooltipDescriptionRef} className={s.tooltipDescription} />
        </div>
      ) : null}

      {!showFallback && hintVisible ? (
        <p className={s.hint} aria-hidden="true">
          arrastra para girar · toca un átomo
        </p>
      ) : null}

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
