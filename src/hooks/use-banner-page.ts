"use client"

import { useEffect } from 'react'
import { usePageLayout } from '@/app/(public)/(site)/layout'

/**
 * Hook to use in pages that have a banner image that goes underneath the floating header.
 * This will remove the top padding from the layout so the banner can display properly.
 * 
 * @example
 * ```tsx
 * export default function MyPage() {
 *   useBannerPage() // Call this hook if your page has a banner
 *   
 *   return (
 *     <section className="-mt-2">
 *       {/* Banner content that goes under header *\/}
 *     </section>
 *   )
 * }
 * ```
 */
export function useBannerPage() {
  const { setHasBanner } = usePageLayout()
  
  useEffect(() => {
    setHasBanner(true)
    return () => {
      setHasBanner(false)
    }
  }, [setHasBanner])
}

