// Single source for the portfolio's static head tags and its runtime title/description.
// index.html reads these through %seo.<key>% placeholders (see seoHtmlPlugin in vite.config.js),
// so social crawlers that never run JavaScript get the same values as useDocumentMeta.
// Keep this file constants-only: vite.config.js imports it.
export const siteUrl = 'https://portafolio-skarlet-a.vercel.app'

export const portfolioSeo = {
  title: 'Skarlet Araque — Building scalable, accessible, user-centered products',
  description:
    'Frontend engineer and product-minded builder with a background in e-commerce and fintech. Explore case studies, including Finora, a full-stack personal finance app.',
  url: `${siteUrl}/`,
  imageUrl: `${siteUrl}/og-image.png`,
}
