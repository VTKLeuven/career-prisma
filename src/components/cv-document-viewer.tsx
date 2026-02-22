'use client'

import { useEffect, useRef, useState } from 'react'

interface CVDocumentViewerProps {
  fileUrl: string
  className?: string
  title?: string
}

export function CVDocumentViewer({ fileUrl, className = '', title }: CVDocumentViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pagesContainerRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !scrollContainerRef.current || !pagesContainerRef.current) return

    let alive = true
    const scrollContainer = scrollContainerRef.current
    const pagesContainer = pagesContainerRef.current

    function getContainerSize() {
      const w = scrollContainer.clientWidth || 900
      const h = scrollContainer.clientHeight || (typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.85) : 800)
      return { w, h }
    }

    async function loadAndRenderAllPages() {
      try {
        setLoading(true)
        setError(null)
        pagesContainer.innerHTML = ''

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const response = await fetch(fileUrl, { credentials: 'include' })
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()
        if (!alive) return

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        if (!alive) return

        const numPages = pdf.numPages || 1
        const { w: containerWidth } = getContainerSize()
        const firstPage = await pdf.getPage(1)
        const defaultViewport = firstPage.getViewport({ scale: 1.0 })
        const scale = (containerWidth / defaultViewport.width) * 2.0

        for (let i = 1; i <= numPages; i++) {
          if (!alive) return

          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height

          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Could not get canvas context')

          await page.render({ canvas, canvasContext: ctx, viewport } as any).promise

          canvas.style.width = '100%'
          canvas.style.height = 'auto'
          canvas.style.display = 'block'
          canvas.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
          canvas.style.borderRadius = '0.375rem'
          canvas.title = title || ''

          const wrapper = document.createElement('div')
          wrapper.className = 'mb-4 last:mb-0'
          wrapper.appendChild(canvas)
          pagesContainer.appendChild(wrapper)
        }

        if (alive) setLoading(false)
      } catch (e) {
        console.error('[CVDocumentViewer] Error rendering PDF:', e)
        if (alive) {
          setError('Failed to load CV')
          setLoading(false)
        }
      }
    }

    // Defer slightly so container has dimensions after layout
    const t = setTimeout(loadAndRenderAllPages, 50)
    return () => {
      alive = false
      clearTimeout(t)
      pagesContainer.innerHTML = ''
    }
  }, [fileUrl, mounted, title])

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ minHeight: '600px' }}>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`} style={{ minHeight: '600px' }}>
        <div className="text-muted-foreground">{error}</div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col min-h-0 ${className}`.trim()}>
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-[70vh] bg-white overflow-y-auto overflow-x-hidden border rounded-lg shadow-sm relative"
        style={{ minHeight: '70vh', height: 'calc(100vh - 10rem)', width: '100%' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}
        <div ref={pagesContainerRef} className="p-2" />
      </div>
    </div>
  )
}


