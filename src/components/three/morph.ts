import { Vector3 } from 'three'

/** Easing clásico de Hermite - mismo usado por el prototipo para el morph y las opacidades que dependen de él. */
export function smoothstep(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * Un paso de "avance hacia el objetivo": progress converge exponencialmente
 * hacia target a razón de `rate` por frame, y se encaja en el valor exacto
 * cuando ya está lo bastante cerca (evita que quede oscilando para siempre).
 */
export function advanceProgress(progress: number, target: number, rate: number): number {
  const next = progress + (target - progress) * rate
  return Math.abs(target - next) < 0.0005 ? target : next
}

/** Interpola in-place cada posición de `from` hacia la de `to` según `easedProgress` (ya pasado por smoothstep). */
export function interpolatePositions(
  from: readonly Vector3[],
  to: readonly Vector3[],
  easedProgress: number,
  out: Vector3[]
): void {
  for (let i = 0; i < from.length; i += 1) {
    out[i].copy(from[i]).lerp(to[i], easedProgress)
  }
}

/** Normaliza un ángulo a (-PI, PI], usado al "enderezar" la rotación al compilar. */
export function normalizeAngle(angle: number): number {
  return ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
}
