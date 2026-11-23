import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GROUP_COLORS, GROUP_KEYS } from '@portfolio-data/groups'
import { StaticMoleculeFallback } from './StaticMoleculeFallback'
import { useMoleculeScene } from './useMoleculeScene'
import { isWebglSupported } from './webglSupport'
import s from './MoleculeHero.module.css'

export function MoleculeHero() {
  const { t } = useTranslation()
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
    <div ref={containerRef} className={s.stage} role="img" aria-label={t('molecule.accessibleName')}>
      <div className={s.top}>
        <p className={s.stateLabel} data-testid="hero-molecule-state-label">
          {t('molecule.stateLabel')}{' '}
          <b className={s.stateValue}>{compiled ? t('molecule.stateTree') : t('molecule.stateMolecule')}</b>
        </p>
        <button
          type="button"
          className={s.morphButton}
          onClick={handleMorphClick}
          data-testid="hero-molecule-morph-button"
        >
          {compiled ? t('molecule.backButton') : t('molecule.compileButton')}
        </button>
      </div>

      {webglSupported ? <canvas ref={canvasRef} className={s.canvas} aria-hidden="true" /> : null}
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
          {t('molecule.hint')}
        </p>
      ) : null}

      <ul className={s.legend}>
        {GROUP_KEYS.map((group) => (
          <li key={group} className={s.legendItem}>
            <span className={s.legendDot} style={{ '--c': GROUP_COLORS[group] } as React.CSSProperties} />
            {t(`groups.${group}`)}
          </li>
        ))}
      </ul>
    </div>
  )
}
