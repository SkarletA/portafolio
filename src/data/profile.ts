import type { Group } from './groups'

export interface ExperienceEntry {
  title: string
  company: string
  place: string
  dates: string
  context?: string
  bullets: string[]
  /** Resumen corto usado por la tarjeta "Ben & Frank" en la sección de Proyectos. */
  cardSummary?: string
}

// Clave estable para la etiqueta de cada certificación/diploma; el texto
// visible vive en locales/{es,en}/continuingEducation.json -> certifications.*
// (algunos, como nombres de cursos de Platzi, son iguales en ambos idiomas;
// otros, como la certificación interna, no).
export interface CertificationEntry {
  key: string
  issuer: string
  dates?: string
  kind: 'certification' | 'diploma'
}

// Igual que CertificationEntry: el nombre del idioma y el nivel ("Nativo"/
// "Native") se traducen vía locales/{es,en}/continuingEducation.json ->
// languageNames.*/languageLevels.*.
export interface LanguageEntry {
  key: 'es' | 'en'
  levelKey: 'native' | 'b1'
}

export interface ElementEntry {
  symbol: string
  name: string
  group: Group
}

export interface Badge {
  name: string
  issuer: string
  year?: string
}

// El copy del Hero (tagline, texto de apoyo, CTAs), de "Del laboratorio al
// código" y de "Mi formación en Laboratoria" vive en
// locales/{es,en}/{common,lab,laboratoria}.json, no aquí, porque necesita
// una versión en cada idioma. Lo mismo aplica a la licenciatura en Química
// (ver locales/{es,en}/continuingEducation.json -> education.*): ya no está
// en este archivo.
export interface Profile {
  name: string
  role: string
  location: string
  availability: string
  email: string
  phone: string
  linkedin: string
  github: string
  summary: string[]
  competencies: string[]
  experience: ExperienceEntry[]
  certifications: CertificationEntry[]
  languages: LanguageEntry[]
  credlyUrl: string
  /** Vacío hasta tener nombres reales de insignias - no se inventan. */
  badges: Badge[]
  elements: ElementEntry[]
}

export const profile: Profile = {
  name: 'Skarlet Araque',
  role: 'Frontend Developer · Product Tech Lead',
  location: 'San Mateo Atenco, Estado de México, México',
  availability: 'Abierta a roles remotos o híbridos',
  email: 'skarlet15m@gmail.com',
  phone: '+52 55 7851 7838',
  linkedin: 'https://linkedin.com/in/skarlet-araque',
  github: 'https://github.com/SkarletA',
  summary: [
    'Frontend Developer y Product Tech Lead con 4+ años de experiencia construyendo y escalando plataformas de e-commerce de punta a punta (catálogo, carrito, checkout) para un grupo retail multi-marca con operaciones en México, Chile y Colombia.',
    'Participo en un squad multidisciplinario de 6–7 personas (QA, Diseño, Backend, Product Manager, Scrum) usando React, Next.js, TypeScript y Node.js, colaborando en decisiones de arquitectura, definición de servicios y discusiones de ADRs junto a los equipos de backend.',
    'Contribuyo a integrar pensamiento de producto en ingeniería — a través de OKRs, CSAT y experimentación A/B — en colaboración cercana con Diseño, QA, Marketing y Merchandising. Hago mentoring (1:1s y pair programming) con un grupo de 4 compañeros, y me muevo bien entre Scrum, Kanban y flujos de desarrollo asistidos por IA.',
    'Finora — una app de finanzas personales construida de punta a punta dentro de este mismo portafolio — es una demostración práctica de estas prácticas fuera de un contexto laboral: un código React/TypeScript tipado con su propia suite de pruebas, un design system en Storybook, decisiones de arquitectura documentadas (ADRs) y un pipeline de CI que corre lint, tests y build en cada pull request.',
  ],
  competencies: [
    'Decisiones técnicas',
    'Colaboración multidisciplinaria',
    'Roadmap y priorización de producto',
    'Arquitectura de sistemas y diseño de servicios',
    'Arquitectura frontend',
    'A/B testing y experimentación',
    'Mentoring y pair programming',
    'Entrega ágil (Scrum/Kanban)',
    'Experiencia de cliente (CSAT/OKRs)',
    'Gestión de stakeholders',
  ],
  experience: [
    {
      title: 'Product Tech Lead',
      company: 'Lentes Galileo, S.A.P.I. (Ben & Frank / bombavista)',
      place: 'Ciudad de México, México',
      dates: 'Jun 2025 – Ago 2026',
      context: 'Grupo retail multi-marca con operaciones en México, Chile y Colombia.',
      bullets: [
        'Participo en un squad multidisciplinario de 6–7 personas (QA, Diseño, Backend, Product Manager, Scrum), colaborando en la priorización técnica, el code review y el mentoring — incluyendo 4 compañeros mentoreados con 1:1 y pair programming — mientras me mantengo como contribuidora individual (Kanban).',
        'Colaboro con Backend en la definición de servicios, mutaciones e integraciones; participo en ADRs y discovery técnico; trabajo con QA mediante peer programming contra criterios de aceptación antes de cada release.',
        'Contribuyo a decisiones de producto en funcionalidades como la experiencia de "casillero" (pickup locker) en tienda y web, dentro de un marco de OKRs enfocado en experiencia de cliente (CSAT sostenido en 3.8 en un contexto omnicanal creciente).',
        'Participé en la migración de páginas críticas del flujo de compra (categorías, carrito, checkout) de Odoo a una arquitectura React en Vercel y EKS, reemplazando un despliegue nocturno de varias horas por una arquitectura más rápida, basada en componentes y reutilizable, con A→B switching vía feature flags.',
        'Impulsé la integración de búsqueda con Algolia, implementé monitoreo con Sentry y Grafana, y colaboré en la gestión de Bloomreach y Google Analytics para dashboards, campañas, recomendaciones y experimentos A/B.',
      ],
      cardSummary:
        'Participé en la migración del flujo de compra de Odoo a React, Vercel y AWS EKS, la integración con Algolia y experimentos A/B con Bloomreach.',
    },
    {
      title: 'Frontend Developer (Mid)',
      company: 'Lentes Galileo, S.A.P.I. (Ben & Frank)',
      place: 'Ciudad de México, México',
      dates: 'Ago 2023 – Jun 2025',
      bullets: [
        'Construí y mantuve experiencias completas del flujo de compra (colecciones, página de producto, carrito) usando React, TypeScript y Next.js; configuré productos y campañas promocionales para lanzamientos junto a negocio y marketing.',
        'Implementé experimentos de tracking usando Bloomreach, data layer y ConfigCat para optimizar la experiencia de compra, y contribuí al desarrollo de nuevas páginas usando Plasmic CMS.',
      ],
    },
    {
      title: 'Frontend Developer (Jr)',
      company: 'Lentes Galileo, S.A.P.I. (Ben & Frank)',
      place: 'Ciudad de México, México',
      dates: 'Ago 2022 – Ago 2023',
      bullets: [
        'Desarrollé componentes del flujo de compra bajo la guía de desarrolladores senior usando React, JavaScript y Node.js; colaboré en la configuración de productos y campañas dentro de Odoo.',
        'Gané experiencia práctica con CommerceTools, MongoDB y pruebas con Jest.',
      ],
    },
    {
      title: 'Accounts Payable Lead / Ejecutiva Administrativa',
      company: 'Spray Química, C.A.',
      place: 'Aragua, Venezuela',
      dates: 'Oct 2017 – Abr 2020',
      bullets: [
        'Comencé como pasante de Química y después coordiné el área de Cuentas por Pagar, gestionando asientos contables, retención de impuestos, órdenes de compra, movimientos de inventario y reportes mensuales de desempeño.',
      ],
    },
  ],
  certifications: [
    { key: 'react', issuer: 'Platzi', dates: '2019 – 2022', kind: 'certification' },
    { key: 'javascript', issuer: 'Platzi', dates: '2019 – 2022', kind: 'certification' },
    { key: 'git', issuer: 'Platzi', dates: '2019 – 2022', kind: 'certification' },
    { key: 'databases', issuer: 'Platzi', dates: '2019 – 2022', kind: 'certification' },
    { key: 'internalPerformance', issuer: 'Lentes Galileo', kind: 'certification' },
    { key: 'awsEssentials', issuer: 'AWS', kind: 'diploma' },
  ],
  languages: [
    { key: 'es', levelKey: 'native' },
    { key: 'en', levelKey: 'b1' },
  ],
  credlyUrl: 'https://www.credly.com/users/skarlet-araque/badges/credly',
  badges: [],
  elements: [
    { symbol: 'Re', name: 'React', group: 'frontend' },
    { symbol: 'Nx', name: 'Next.js', group: 'frontend' },
    { symbol: 'Ts', name: 'TypeScript', group: 'frontend' },
    { symbol: 'Sb', name: 'Storybook', group: 'quality' },
    { symbol: 'Vt', name: 'Vitest', group: 'quality' },
    { symbol: 'No', name: 'Node.js', group: 'backend' },
    { symbol: 'Su', name: 'Supabase', group: 'data' },
    { symbol: 'Al', name: 'Algolia', group: 'data' },
    { symbol: 'Bl', name: 'Bloomreach', group: 'data' },
    { symbol: 'Ct', name: 'CommerceTools', group: 'backend' },
    { symbol: 'Od', name: 'Odoo', group: 'backend' },
    { symbol: 'Vc', name: 'Vercel', group: 'infra' },
    { symbol: 'Ek', name: 'AWS / EKS', group: 'infra' },
    { symbol: 'Se', name: 'Sentry', group: 'infra' },
    { symbol: 'Gr', name: 'Grafana', group: 'infra' },
  ],
}
