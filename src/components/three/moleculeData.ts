import { Vector3 } from 'three'
import { RING_SUBSTITUENT_PARENTS } from './moleculeAtoms'

export interface MoleculeEdge {
  from: number
  to: number
  /** Solo relevante para MOLECULE_EDGES: un doble enlace se dibuja como dos cilindros paralelos. */
  double?: boolean
}

const RING_RADIUS = 2
const SUBSTITUENT_RADIUS = 3.6
const SUBSTITUENT_Z: Record<number, number> = { 6: 0.9, 7: -0.9, 8: 0.9 }

function buildRingPositions(): Vector3[] {
  const ring = Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 6 + i * (Math.PI / 3)
    return new Vector3(Math.cos(angle) * RING_RADIUS, Math.sin(angle) * RING_RADIUS, 0)
  })

  const positions = [...ring, new Vector3(), new Vector3(), new Vector3()]
  for (const [childIndex, parentIndex] of Object.entries(RING_SUBSTITUENT_PARENTS)) {
    const child = Number(childIndex)
    const substituent = ring[parentIndex].clone().normalize().multiplyScalar(SUBSTITUENT_RADIUS)
    substituent.z = SUBSTITUENT_Z[child]
    positions[child] = substituent
  }
  return positions
}

const TREE_RAW: [number, number][] = [
  [-2.2, 0.8],
  [0, 2.4],
  [-3.2, -0.8],
  [2.2, 0.8],
  [1.2, -0.8],
  [3.2, -0.8],
  [-1.2, -0.8],
  [-3.2, -2.4],
  [1.2, -2.4],
]
const TREE_SCALE = 0.92
const TREE_Y_OFFSET = -0.3

function buildTreePositions(): Vector3[] {
  return TREE_RAW.map(([x, y]) => new Vector3(x * TREE_SCALE, y * TREE_SCALE + TREE_Y_OFFSET, 0))
}

export const MOLECULE_POSITIONS: Vector3[] = buildRingPositions()
export const TREE_POSITIONS: Vector3[] = buildTreePositions()

/** Furthest any atom sits from the origin, in either layout - used to frame the camera so nothing overflows the canvas. */
export const CONTENT_RADIUS = Math.max(...[...MOLECULE_POSITIONS, ...TREE_POSITIONS].map((v) => v.length()))

export const MOLECULE_EDGES: MoleculeEdge[] = [
  { from: 0, to: 1, double: true },
  { from: 1, to: 2, double: false },
  { from: 2, to: 3, double: true },
  { from: 3, to: 4, double: false },
  { from: 4, to: 5, double: true },
  { from: 5, to: 0, double: false },
  { from: 0, to: 6, double: false },
  { from: 2, to: 7, double: false },
  { from: 4, to: 8, double: false },
]

export const TREE_EDGES: MoleculeEdge[] = [
  { from: 1, to: 0 },
  { from: 1, to: 3 },
  { from: 0, to: 2 },
  { from: 0, to: 6 },
  { from: 3, to: 4 },
  { from: 3, to: 5 },
  { from: 2, to: 7 },
  { from: 4, to: 8 },
]
