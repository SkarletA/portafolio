import type { Group } from '@portfolio-data/groups'

export interface MoleculeAtom {
  symbol: string
  name: string
  group: Group
  description: string
}

/**
 * Los 9 átomos del Hero: índices 0-5 forman el anillo de benceno,
 * 6-8 son los sustituyentes unidos a los átomos del anillo en
 * RING_SUBSTITUENT_PARENTS. Es un subconjunto de los 15 elementos de
 * `profile.elements` (la tabla periódica completa).
 */
export const MOLECULE_ATOMS: MoleculeAtom[] = [
  { symbol: 'Re', name: 'React', group: 'frontend', description: 'Componentes y UI declarativa' },
  { symbol: 'Nx', name: 'Next.js', group: 'frontend', description: 'Frameworks, SSR y rutas' },
  { symbol: 'Ts', name: 'TypeScript', group: 'frontend', description: 'Tipos para sistemas que escalan' },
  { symbol: 'No', name: 'Node.js', group: 'backend', description: 'Servicios y herramientas' },
  { symbol: 'Su', name: 'Supabase', group: 'data', description: 'Backend as a service' },
  { symbol: 'Al', name: 'Algolia', group: 'data', description: 'Búsqueda del catálogo' },
  { symbol: 'Sb', name: 'Storybook', group: 'quality', description: 'Documentar y probar componentes' },
  { symbol: 'Vt', name: 'Vitest', group: 'quality', description: 'Pruebas unitarias' },
  { symbol: 'Vc', name: 'Vercel', group: 'infra', description: 'Deploy y edge' },
]

/** Índice del sustituyente -> índice del átomo del anillo al que está unido. */
export const RING_SUBSTITUENT_PARENTS: Record<number, number> = { 6: 0, 7: 2, 8: 4 }
