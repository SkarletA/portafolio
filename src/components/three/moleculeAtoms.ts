import type { Group } from '@portfolio-data/groups'
import { profile } from '@portfolio-data/profile'

export interface MoleculeAtom {
  symbol: string
  name: string
  group: Group
  /** Clave en locales/{es,en}/common.json -> molecule.atoms.* (tooltip del Hero). */
  descriptionKey: string
}

/**
 * Los 9 átomos del Hero: índices 0-5 forman el anillo de benceno,
 * 6-8 son los sustituyentes unidos a los átomos del anillo en
 * RING_SUBSTITUENT_PARENTS. Es un subconjunto de los 15 elementos de
 * `profile.elements` (la tabla periódica completa).
 */
export const MOLECULE_ATOMS: MoleculeAtom[] = [
  { symbol: 'Re', name: 'React', group: 'frontend', descriptionKey: 'molecule.atoms.react' },
  { symbol: 'Nx', name: 'Next.js', group: 'frontend', descriptionKey: 'molecule.atoms.nextjs' },
  { symbol: 'Ts', name: 'TypeScript', group: 'frontend', descriptionKey: 'molecule.atoms.typescript' },
  { symbol: 'No', name: 'Node.js', group: 'backend', descriptionKey: 'molecule.atoms.nodejs' },
  { symbol: 'Su', name: 'Supabase', group: 'data', descriptionKey: 'molecule.atoms.supabase' },
  { symbol: 'Al', name: 'Algolia', group: 'data', descriptionKey: 'molecule.atoms.algolia' },
  { symbol: 'Sb', name: 'Storybook', group: 'quality', descriptionKey: 'molecule.atoms.storybook' },
  { symbol: 'Vt', name: 'Vitest', group: 'quality', descriptionKey: 'molecule.atoms.vitest' },
  { symbol: 'Vc', name: 'Vercel', group: 'infra', descriptionKey: 'molecule.atoms.vercel' },
]

/** Índice del sustituyente -> índice del átomo del anillo al que está unido. */
export const RING_SUBSTITUENT_PARENTS: Record<number, number> = { 6: 0, 7: 2, 8: 4 }

/**
 * Número de tile por símbolo = posición 1-based en profile.elements (la
 * numeración de "Mi tabla periódica"), no el índice de este subconjunto de 9
 * - así la molécula y la tabla siempre coinciden.
 */
export const ELEMENT_NUMBERS: Record<string, number> = Object.fromEntries(
  profile.elements.map((element, i) => [element.symbol, i + 1])
)
