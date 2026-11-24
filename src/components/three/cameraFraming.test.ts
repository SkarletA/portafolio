import { describe, expect, it } from 'vitest'
import { computeCameraDistance } from './cameraFraming'

describe('computeCameraDistance', () => {
  it('needs more distance for a narrower (portrait) aspect ratio than a wider one', () => {
    const wide = computeCameraDistance(40, 1.2, 4)
    const narrow = computeCameraDistance(40, 0.6, 4)

    expect(narrow).toBeGreaterThan(wide)
  })

  it('needs more distance for a larger content radius', () => {
    const small = computeCameraDistance(40, 0.8, 3)
    const large = computeCameraDistance(40, 0.8, 5)

    expect(large).toBeGreaterThan(small)
  })

  it('places the bounding sphere exactly at the edge of the limiting field of view', () => {
    const aspect = 0.8
    const radius = 4
    const distance = computeCameraDistance(40, aspect, radius)

    const verticalHalf = (40 * Math.PI) / 360
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect)
    const limitingHalf = Math.min(verticalHalf, horizontalHalf)

    expect(Math.sin(limitingHalf) * distance).toBeCloseTo(radius, 5)
  })
})
