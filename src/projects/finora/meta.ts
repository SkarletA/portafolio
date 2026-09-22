export interface ProjectMeta {
  slug: string
  name: string
  status: string
  tagline: string
  description: string
  highlights: string[]
}

export const finora: ProjectMeta = {
  slug: 'finora',
  name: 'Finora',
  status: 'In progress',
  tagline: 'Personal expense management that helps people understand, organize, and act on their finances.',
  description: 'A practical case study of React architecture, state management, data visualization, and product-oriented UX.',
  highlights: [
    'React application architecture',
    'State management',
    'Responsive UI development',
    'Data visualization',
    'Form handling and validation',
    'API integration',
    'UX/UI principles',
    'Scalable frontend patterns',
  ],
}
