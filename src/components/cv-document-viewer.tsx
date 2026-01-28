'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface CVDocumentViewerProps {
  fileUrl: string
  className?: string
  title?: string
}

export function CVDocumentViewer({ fileUrl, className = '', title }: CVDocumentViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [numPages, setNumPages] = useState<number>(1)
  const [pageNumber, setPageNumber] = useState<number>(1)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return

    let alive = true

    async function loadAndRender() {
      if (!canvasRef.current || !containerRef.current) return

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

        setNumPages(pdf.numPages || 1)
        const clampedPage = Math.min(Math.max(1, pageNumber), pdf.numPages || 1)
        if (clampedPage !== pageNumber) setPageNumber(clampedPage)

        const page = await pdf.getPage(clampedPage)
        if (!alive) return

        const containerWidth = containerRef.current.clientWidth || 900
        const defaultViewport = page.getViewport({ scale: 1.0 })
        const scale = containerWidth / defaultViewport.width
        const viewport = page.getViewport({ scale: scale * 2.0 })

        const canvas = canvasRef.current
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas context')

        await page.render({ canvas, canvasContext: ctx, viewport } as any).promise
        if (!alive) return

        // Fit container height to rendered page aspect ratio
        const aspectRatio = viewport.height / viewport.width
        containerRef.current.style.height = `${containerWidth * aspectRatio}px`
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'

        setLoading(false)
      } catch (e) {
        console.error('[CVDocumentViewer] Error rendering PDF:', e)
        if (alive) {
          setError('Failed to load CV')
          setLoading(false)
        }
      }
    }

    loadAndRender()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, mounted, pageNumber])

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
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="text-sm text-muted-foreground">
          Page {pageNumber} / {numPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pageNumber <= 1 || loading}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pageNumber >= numPages || loading}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-white overflow-hidden border rounded-lg shadow-sm relative"
        style={{ minHeight: '800px', width: '100%' }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}
        <canvas ref={canvasRef} title={title} style={{ display: loading ? 'none' : 'block' }} />
      </div>
    </div>
  )
}


