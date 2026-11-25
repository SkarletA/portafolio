// Static head tags for index.html, filled in at build time (see seoHtmlPlugin
// in vite.config.js) so social crawlers that never run JavaScript still get
// real title/description/OG tags. Always in Spanish, matching the document's
// default lang="es" - the runtime title/description shown in the browser tab
// come from src/locales/{es,en}/seo.json via useTranslation and switch with
// the selected language (see AppShell in App.tsx).
// Keep this file constants-only: vite.config.js imports it.
export const siteUrl = 'https://portafolio-skarlet-a.vercel.app'

export const portfolioSeo = {
  title: 'Skarlet Araque · Frontend Developer y Product Tech Lead',
  description:
    '4+ años construyendo catálogo, carrito y checkout para retail multi-marca en LATAM. Estudié química y ahora hago que el código reaccione. Conoce mis proyectos y casos de estudio.',
  url: `${siteUrl}/`,
  imageUrl: `${siteUrl}/og-image.png`,
  imageWidth: '1200',
  imageHeight: '630',
  imageAlt: 'Skarlet Araque, Frontend Developer y Product Tech Lead, con una molécula de tecnologías',
  locale: 'es_MX',
}
