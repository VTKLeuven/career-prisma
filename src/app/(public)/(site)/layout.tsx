"use client"

import { useState, createContext, useContext } from 'react'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { SiteHeader } from '@/components/site/SiteHeader'
import { StudentLikedCompaniesProvider } from '@/providers/StudentLikedCompaniesProvider';

// Context to allow pages to opt-out of header padding if they have a banner
// and to hide the layout header if they render their own
// darkHeaderFooter: when true, header and footer use dark theme (e.g. speaker page)
const PageLayoutContext = createContext<{
  hasBanner: boolean
  setHasBanner: (hasBanner: boolean) => void
  hideLayoutHeader: boolean
  setHideLayoutHeader: (hide: boolean) => void
  darkHeaderFooter: boolean
  setDarkHeaderFooter: (dark: boolean) => void
}>({
  hasBanner: false,
  setHasBanner: () => { },
  hideLayoutHeader: false,
  setHideLayoutHeader: () => { },
  darkHeaderFooter: false,
  setDarkHeaderFooter: () => { },
})

export const usePageLayout = () => useContext(PageLayoutContext)

// Pages that render their own header: an event page, its floorplan and
// company guide, and a company page. Decided from the URL so the site header
// is never rendered first and then removed by the page's effect -- that
// flashed the wrong header and fetched its data for nothing.
const OWN_HEADER_PATHS = [
  /^\/event\/[^/]+\/?$/,
  /^\/event\/[^/]+\/(floorplan|company-guide)\/?$/,
  /^\/company\/[^/]+\/?$/,
]

export default function NoSidebarLayout({ children }: { children: React.ReactNode }) {
  const [hasBanner, setHasBanner] = useState(false)
  const [hideLayoutHeader, setHideLayoutHeader] = useState(false)
  const [darkHeaderFooter, setDarkHeaderFooter] = useState(false)
  const pathname = usePathname()
  const hideHeader = hideLayoutHeader || OWN_HEADER_PATHS.some((re) => re.test(pathname ?? ''))
  // simple shell without sidebar/header
  // Apply padding only if page doesn't have a banner and layout header is shown
  return (
    <PageLayoutContext.Provider value={{ hasBanner, setHasBanner, hideLayoutHeader, setHideLayoutHeader, darkHeaderFooter, setDarkHeaderFooter }}>
      <StudentLikedCompaniesProvider>
        <main
          className={`min-h-svh text-neutral-900 ${hasBanner || hideHeader ? '' : 'pt-28 md:pt-32'} ${darkHeaderFooter ? 'text-neutral-100' : 'bg-vtk-bg'}`}
          style={darkHeaderFooter ? { background: 'linear-gradient(135deg, var(--color-vtk-blue) 0%, var(--color-vtk-blue-dark) 50%, var(--color-vtk-blue-darker) 100%)' } : undefined}
        >
          {!hideHeader && <SiteHeader dark={darkHeaderFooter} />}
          <div className={darkHeaderFooter ? 'relative z-10' : undefined}>
            {children}
            <Footer />
          </div>
        </main>
      </StudentLikedCompaniesProvider>
    </PageLayoutContext.Provider>
  )
}
