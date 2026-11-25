// Single source for the portfolio's static head tags and its runtime title/description.
// index.html reads these through %seo.<key>% placeholders (see seoHtmlPlugin in vite.config.js),
// so social crawlers that never run JavaScript get the same values as useDocumentMeta.
// Keep this file constants-only: vite.config.js imports it.
export const siteUrl = 'https://portafolio-skarlet-a.vercel.app'

export const portfolioSeo = {
  title: 'Skarlet Araque · Frontend Developer y Product Tech Lead',
  description:
    'Frontend Developer y Product Tech Lead con 4 años en e-commerce. Estudié química y ahora hago que el código reaccione. Conoce mis proyectos.',
  url: `${siteUrl}/`,
  imageUrl: `${siteUrl}/og-image.png`,
  imageWidth: '1200',
  imageHeight: '630',
  imageAlt: 'Skarlet Araque, Frontend Developer y Product Tech Lead, con una molécula de tecnologías',
  locale: 'es_MX',
}
