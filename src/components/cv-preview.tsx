'use client'

import { useEffect, useRef, useState } from 'react'

interface CVPreviewProps {
  fileUrl: string
  className?: string
  title?: string
}

export function CVPreview({ fileUrl, className = '', title }: CVPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component only renders on client
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let isMounted = true

    async function renderFirstPage() {
      if (!canvasRef.current || !containerRef.current) return

      try {
        setLoading(true)
        setError(null)

        // Dynamically import PDF.js only on client side.
        // Use the "legacy" build + a locally bundled worker URL to avoid external CDN fetches
        // (CDN worker fetch fails in some environments, causing "fake worker" errors).
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

        // Point the worker to a locally bundled asset (served by Next), not a CDN.
        // Turbopack supports `new URL(..., import.meta.url)` for worker assets.
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        // Fetch PDF as blob with credentials for authenticated access
        const response = await fetch(fileUrl, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status}`)
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()

        if (!isMounted) return

        // Load the PDF from array buffer
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
        })
        const pdf = await loadingTask.promise

        if (!isMounted) return

        // Get the first page only
        const page = await pdf.getPage(1)
        
        // Calculate scale to fit container width
        const container = containerRef.current
        const containerWidth = container.clientWidth || 600 // Fallback width
        const defaultViewport = page.getViewport({ scale: 1.0 })
        const scale = containerWidth / defaultViewport.width
        const viewport = page.getViewport({ scale: scale * 2.0 }) // Higher scale for better quality

        // Set canvas dimensions
        const canvas = canvasRef.current
        canvas.width = viewport.width
        canvas.height = viewport.height

        // Render the page
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Could not get canvas context')
        }

        // pdfjs-dist typings differ across builds/versions; provide both `canvas` and `canvasContext`
        await page.render({
          canvas,
          canvasContext: context,
          viewport: viewport,
        } as any).promise

        if (!isMounted) return

        // Set container height to match canvas aspect ratio
        const aspectRatio = viewport.height / viewport.width
        const containerHeight = containerWidth * aspectRatio
        container.style.height = `${containerHeight}px`
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'

        setLoading(false)
      } catch (err) {
        console.error('[CVPreview] Error rendering PDF:', err)
        if (isMounted) {
          setError('Failed to load PDF')
          setLoading(false)
        }
      }
    }

    renderFirstPage()

    return () => {
      isMounted = false
    }
  }, [fileUrl, mounted])

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
        <div className="text-muted-foreground">Failed to load CV</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`bg-white overflow-hidden ${className}`}
      style={{ minHeight: '600px', width: '100%', position: 'relative' }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        title={title}
        style={{ display: loading ? 'none' : 'block' }}
      />
    </div>
  )
}
