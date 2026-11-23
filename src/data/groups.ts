export type Group = 'frontend' | 'backend' | 'data' | 'infra' | 'quality'

/** Orden estable para renderizar los 5 grupos (p. ej. la leyenda del Hero). Las etiquetas viven en locales/{es,en}/common.json -> groups.*. */
export const GROUP_KEYS: Group[] = ['frontend', 'backend', 'data', 'infra', 'quality']

export const GROUP_COLORS: Record<Group, string> = {
  frontend: '#ff4d5e',
  backend: '#2dd4bf',
  data: '#60a5fa',
  infra: '#fbbf24',
  quality: '#a78bfa',
}
