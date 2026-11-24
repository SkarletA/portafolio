/**
 * Distance along a perspective camera's forward axis so a sphere of
 * `radius` centered at the origin fits inside the camera's view, for a
 * given vertical FOV (degrees) and aspect ratio (width / height). Uses
 * whichever of the vertical/horizontal half-FOV is tighter, so a narrow
 * (portrait) aspect pulls the camera back further instead of letting the
 * content overflow the sides.
 */
export function computeCameraDistance(verticalFovDegrees: number, aspect: number, radius: number): number {
  const verticalHalf = (verticalFovDegrees * Math.PI) / 360
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * aspect)
  const limitingHalf = Math.min(verticalHalf, horizontalHalf)
  return radius / Math.sin(limitingHalf)
}
