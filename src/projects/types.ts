export interface ProjectMeta {
  slug: string
  name: string
  /** Letras del tile estilo tabla periódica (p. ej. "Fn"). */
  symbol: string
  accentColor: string
  /** Claves en locales/{es,en}/projects.json -> tags.* (no texto directo: algunos tags se traducen). */
  tags: string[]
  /** Ruta interna (react-router); si no se da, la tarjeta no es un link. */
  href?: string
}
