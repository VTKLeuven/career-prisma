'use client'

import { useEffect, useRef, useState } from 'react'

interface CVFirstPagePreviewProps {
  fileUrl: string
  fileId?: string | null
  className?: string
  title?: string
}

const THUMBNAIL_WIDTH = 700
const THUMBNAIL_QUALITY = 85

export function CVFirstPagePreview({ fileUrl, fileId, className = '', title }: CVFirstPagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let alive = true
    const abortController = new AbortController()
    const resolvedFileId = fileId || fileUrl.split('/').pop() || null

    async function load() {
      if (!resolvedFileId) {
        setError(true)
        setLoading(false)
        return
      }

      // Strategy 1: Directus server-side thumbnail transform (returns small webp image)
      try {
        const res = await fetch(
          `/api/cv-file/${resolvedFileId}?w=${THUMBNAIL_WIDTH}&q=${THUMBNAIL_QUALITY}&format=webp`,
          { credentials: 'include', signal: abortController.signal }
        )
        if (res.ok) {
          const ct = res.headers.get('content-type') || ''
          if (ct.startsWith('image/')) {
            const blob = await res.blob()
            if (!alive) return
            const url = URL.createObjectURL(blob)
            blobUrlRef.current = url
            setImageSrc(url)
            setLoading(false)
            return
          }
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }

      // Strategy 2: Low-resolution pdfjs fallback (renders first page at ~400px width)
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()

        const response = await fetch(fileUrl, {
          credentials: 'include',
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()
        if (!alive) return

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        if (!alive) { pdf.destroy(); return }

        const page = await pdf.getPage(1)
        const defaultViewport = page.getViewport({ scale: 1.0 })
        const scale = THUMBNAIL_WIDTH / defaultViewport.width
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No canvas context')

        await page.render({ canvas, canvasContext: ctx, viewport } as any).promise
        pdf.destroy()
        if (!alive) return

        // Convert canvas → blob URL to free canvas GPU memory
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
            'image/webp',
            0.85
          )
        })
        canvas.width = 0
        canvas.height = 0

        if (!alive) return
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        setImageSrc(url)
        setLoading(false)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        console.error('[CVFirstPagePreview]', e)
        if (alive) {
          setError(true)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      alive = false
      abortController.abort()
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [isVisible, fileUrl, fileId])

  return (
    <div ref={containerRef} className={`relative ${className}`.trim()}>
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10 rounded-lg">
          <div className="text-muted-foreground text-sm">
            {isVisible ? 'Loading CV...' : ''}
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-muted-foreground text-sm">Failed to load CV</div>
        </div>
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={title || 'CV preview'}
          className="w-full h-auto block"
        />
      )}
      {!imageSrc && !error && <div className="w-full min-h-[200px]" />}
    </div>
  )
}
