import { useEffect } from 'react'

export interface DocumentMeta {
  title: string
  description: string
  /** Path to the favicon file to use, e.g. `/favicon.svg`. */
  favicon: string
}

/**
 * Updates document.title, the meta description and the favicon tag on
 * mount and whenever the values change - for client-side route changes
 * between app boundaries (the portfolio vs /finora) that never reload the
 * page, so each keeps its own title/description/favicon instead of
 * inheriting whichever was set first. Deliberately not a library
 * (react-helmet or similar) - only two call sites (App.tsx, FinoraApp.tsx),
 * each passing its own fixed values; no per-route logic lives in here.
 */
export function useDocumentMeta({ title, description, favicon }: DocumentMeta) {
  useEffect(() => {
    document.title = title

    const descriptionTag = document.querySelector('meta[name="description"]')
    if (descriptionTag) descriptionTag.setAttribute('content', description)

    const faviconTag = document.querySelector('link[rel="icon"]')
    if (faviconTag) faviconTag.setAttribute('href', favicon)
  }, [title, description, favicon])
}
