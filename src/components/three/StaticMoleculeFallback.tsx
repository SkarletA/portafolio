import { GROUP_COLORS } from '@portfolio-data/groups'
import { MOLECULE_ATOMS, RING_SUBSTITUENT_PARENTS } from './moleculeAtoms'
import s from './StaticMoleculeFallback.module.css'

interface Point {
  x: number
  y: number
}

const CENTER = 160
const RING_RADIUS = 64.6
const SUBSTITUENT_RADIUS = 122.7
const TREE_UNIT = 35
const TREE_Y_OFFSET = -11.4

const RING_POSITIONS: Point[] = Array.from({ length: 6 }, (_, i) => {
  const angle = Math.PI / 6 + i * (Math.PI / 3)
  return { x: Math.cos(angle) * RING_RADIUS, y: Math.sin(angle) * RING_RADIUS }
})

const SUBSTITUENT_POSITIONS: Point[] = Object.entries(RING_SUBSTITUENT_PARENTS).map(([, parentIndex]) => {
  const parent = RING_POSITIONS[parentIndex]
  const magnitude = Math.hypot(parent.x, parent.y)
  return { x: (parent.x / magnitude) * SUBSTITUENT_RADIUS, y: (parent.y / magnitude) * SUBSTITUENT_RADIUS }
})

const MOLECULE_POSITIONS: Point[] = [...RING_POSITIONS, ...SUBSTITUENT_POSITIONS]

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

const TREE_POSITIONS: Point[] = TREE_RAW.map(([x, y]) => ({
  x: x * TREE_UNIT,
  y: y * TREE_UNIT + TREE_Y_OFFSET,
}))

const MOLECULE_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 6],
  [2, 7],
  [4, 8],
]

const TREE_EDGES: [number, number][] = [
  [1, 0],
  [1, 3],
  [0, 2],
  [0, 6],
  [3, 4],
  [3, 5],
  [2, 7],
  [4, 8],
]

const TILE_WIDTH = 56
const TILE_HEIGHT = 56

interface StaticMoleculeFallbackProps {
  compiled: boolean
}

export function StaticMoleculeFallback({ compiled }: StaticMoleculeFallbackProps) {
  const positions = compiled ? TREE_POSITIONS : MOLECULE_POSITIONS
  const edges = compiled ? TREE_EDGES : MOLECULE_EDGES

  return (
    <svg className={s.svg} viewBox="0 0 320 320" role="presentation" aria-hidden="true">
      {!compiled ? <circle className={s.cloud} cx={CENTER} cy={CENTER} r={RING_RADIUS * 0.68} /> : null}
      {edges.map(([from, to]) => {
        const a = positions[from]
        const b = positions[to]
        return (
          <line
            key={`${from}-${to}`}
            className={s.bond}
            x1={CENTER + a.x}
            y1={CENTER + a.y}
            x2={CENTER + b.x}
            y2={CENTER + b.y}
          />
        )
      })}
      {MOLECULE_ATOMS.map((atom, i) => {
        const pos = positions[i]
        return (
          <g
            key={atom.symbol}
            className={s.tile}
            style={{ transform: `translate(${CENTER + pos.x}px, ${CENTER + pos.y}px)`, '--c': GROUP_COLORS[atom.group] } as React.CSSProperties}
          >
            <rect
              className={s.tileRect}
              x={-TILE_WIDTH / 2}
              y={-TILE_HEIGHT / 2}
              width={TILE_WIDTH}
              height={TILE_HEIGHT}
            />
            <text className={s.tileSymbol} y={2}>
              {atom.symbol}
            </text>
            <text className={s.tileName} y={16}>
              {atom.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
