import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentMeta } from './useDocumentMeta'

function setDescriptionTag(content: string) {
  let tag = document.querySelector('meta[name="description"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', 'description')
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setFaviconTag(href: string) {
  let tag = document.querySelector('link[rel="icon"]')
  if (!tag) {
    tag = document.createElement('link')
    tag.setAttribute('rel', 'icon')
    document.head.appendChild(tag)
  }
  tag.setAttribute('href', href)
}

describe('useDocumentMeta', () => {
  it('sets document.title, the meta description and the favicon', () => {
    setDescriptionTag('placeholder')
    setFaviconTag('/placeholder.svg')

    renderHook(() =>
      useDocumentMeta({ title: 'Finora — Take control of your money', description: 'Track spending.', favicon: '/finora-favicon.svg' })
    )

    expect(document.title).toBe('Finora — Take control of your money')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Track spending.')
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/finora-favicon.svg')
  })

  it('switches every value when a different meta is passed, as on a client-side route change', () => {
    setDescriptionTag('placeholder')
    setFaviconTag('/placeholder.svg')

    const { rerender } = renderHook((props) => useDocumentMeta(props), {
      initialProps: { title: 'Finora — Take control of your money', description: 'Track spending.', favicon: '/finora-favicon.svg' },
    })
    rerender({
      title: 'Skarlet Araque — Building scalable, accessible, user-centered products',
      description: 'Frontend engineer.',
      favicon: '/favicon.svg',
    })

    expect(document.title).toBe('Skarlet Araque — Building scalable, accessible, user-centered products')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute('content', 'Frontend engineer.')
    expect(document.querySelector('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  })

  it('does nothing if the description or favicon tag is missing from the document', () => {
    document.querySelector('meta[name="description"]')?.remove()
    document.querySelector('link[rel="icon"]')?.remove()

    expect(() =>
      renderHook(() => useDocumentMeta({ title: 'Finora', description: 'Track spending.', favicon: '/finora-favicon.svg' }))
    ).not.toThrow()
    expect(document.title).toBe('Finora')
  })
})
