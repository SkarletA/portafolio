import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { advanceProgress, interpolatePositions, normalizeAngle, smoothstep } from './morph'

describe('smoothstep', () => {
  it('maps the endpoints to themselves', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
  })

  it('eases through the midpoint', () => {
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
  })

  it('clamps out-of-range input', () => {
    expect(smoothstep(-2)).toBe(0)
    expect(smoothstep(2)).toBe(1)
  })

  it('is monotonically increasing', () => {
    const samples = [0, 0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1]
    const eased = samples.map(smoothstep)
    for (let i = 1; i < eased.length; i += 1) {
      expect(eased[i]).toBeGreaterThanOrEqual(eased[i - 1])
    }
  })
})

describe('advanceProgress', () => {
  it('moves progress towards the target', () => {
    const next = advanceProgress(0, 1, 0.055)
    expect(next).toBeCloseTo(0.055, 5)
  })

  it('snaps to the target once close enough', () => {
    expect(advanceProgress(0.9999, 1, 0.055)).toBe(1)
  })

  it('converges to the target after enough steps', () => {
    let progress = 0
    for (let i = 0; i < 200; i += 1) {
      progress = advanceProgress(progress, 1, 0.055)
    }
    expect(progress).toBe(1)
  })

  it('works symmetrically towards 0', () => {
    let progress = 1
    for (let i = 0; i < 200; i += 1) {
      progress = advanceProgress(progress, 0, 0.055)
    }
    expect(progress).toBe(0)
  })
})

describe('interpolatePositions', () => {
  it('matches "from" at progress 0 and "to" at progress 1', () => {
    const from = [new Vector3(0, 0, 0), new Vector3(1, 1, 1)]
    const to = [new Vector3(2, 2, 2), new Vector3(-1, 0, 3)]
    const out = [new Vector3(), new Vector3()]

    interpolatePositions(from, to, 0, out)
    expect(out[0].toArray()).toEqual([0, 0, 0])
    expect(out[1].toArray()).toEqual([1, 1, 1])

    interpolatePositions(from, to, 1, out)
    expect(out[0].toArray()).toEqual([2, 2, 2])
    expect(out[1].toArray()).toEqual([-1, 0, 3])
  })

  it('lerps at intermediate progress', () => {
    const from = [new Vector3(0, 0, 0)]
    const to = [new Vector3(10, 0, 0)]
    const out = [new Vector3()]

    interpolatePositions(from, to, 0.5, out)

    expect(out[0].x).toBeCloseTo(5, 5)
  })
})

describe('normalizeAngle', () => {
  it('leaves angles already in (-PI, PI] untouched', () => {
    expect(normalizeAngle(0)).toBeCloseTo(0, 5)
    expect(normalizeAngle(1)).toBeCloseTo(1, 5)
    expect(normalizeAngle(-1)).toBeCloseTo(-1, 5)
  })

  it('wraps angles outside the range back into it', () => {
    expect(normalizeAngle(2.5 * Math.PI)).toBeCloseTo(0.5 * Math.PI, 5)
    expect(normalizeAngle(-2.5 * Math.PI)).toBeCloseTo(-0.5 * Math.PI, 5)
  })
})
