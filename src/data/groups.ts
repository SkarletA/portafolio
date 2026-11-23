export type Group = 'frontend' | 'backend' | 'data' | 'infra' | 'quality'

export const GROUP_LABELS: Record<Group, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Datos / búsqueda',
  infra: 'Infraestructura',
  quality: 'Calidad',
}

export const GROUP_COLORS: Record<Group, string> = {
  frontend: '#ff4d5e',
  backend: '#2dd4bf',
  data: '#60a5fa',
  infra: '#fbbf24',
  quality: '#a78bfa',
}
