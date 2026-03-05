'use client'

import { useEffect, useRef, useState } from 'react'

interface CVFirstPagePreviewProps {
  fileUrl: string
  className?: string
  title?: string
}

/** Renders only the first page of a PDF as canvas (no iframe/PDF viewer). Used in CV Book overview. */
export function CVFirstPagePreview({ fileUrl, className = '', title }: CVFirstPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted || !containerRef.current) return

    let alive = true

    async function loadAndRenderFirstPage() {
      try {
        setLoading(true)
        setError(null)

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

        const page = await pdf.getPage(1)
        const containerWidth = containerRef.current?.clientWidth || 400
        const defaultViewport = page.getViewport({ scale: 1.0 })
        const pixelRatio = typeof window !== 'undefined' ? Math.max(2, window.devicePixelRatio || 2) : 2
        const scale = (containerWidth / defaultViewport.width) * pixelRatio
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = '100%'
        canvas.style.height = 'auto'
        canvas.style.display = 'block'
        canvas.title = title || ''

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        await page.render({ canvas, canvasContext: ctx, viewport } as any).promise
        if (!alive) return

        const container = containerRef.current
        if (!container) return
        container.innerHTML = ''
        container.appendChild(canvas)
        canvasRef.current = canvas

        if (alive) setLoading(false)
      } catch (e) {
        console.error('[CVFirstPagePreview] Error rendering PDF:', e)
        if (alive) {
          setError('Failed to load CV')
          setLoading(false)
        }
      }
    }

    const t = setTimeout(loadAndRenderFirstPage, 50)
    return () => {
      alive = false
      clearTimeout(t)
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [fileUrl, mounted, title])

  if (!mounted) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`.trim()} style={{ minHeight: 200 }}>
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`.trim()} style={{ minHeight: 200 }}>
        <div className="text-muted-foreground text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`.trim()}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10 rounded-lg">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full min-h-[200px]" />
    </div>
  )
}
