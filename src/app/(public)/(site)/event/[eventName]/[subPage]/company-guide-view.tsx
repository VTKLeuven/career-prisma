"use client"

import { useEffect } from "react"
import { usePageLayout } from "../../../layout"
import { SubPageHeader } from "./sub-page-header"

/** The event's company guide PDF, under the sub-page header. */
export function CompanyGuideView({ eventName, fileId }: { eventName: string; fileId: string | null }) {
  const { setHideLayoutHeader } = usePageLayout()

  // The guide renders its own fixed header.
  useEffect(() => {
    if (!fileId) return
    setHideLayoutHeader(true)
    return () => setHideLayoutHeader(false)
  }, [fileId, setHideLayoutHeader])

  if (!fileId) {
    return (
      <div className="p-10 text-center text-neutral-700">
        <h1 className="text-2xl font-semibold">Company Guide</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Company guide not available.
        </p>
      </div>
    )
  }

  // Use API route to proxy PDF to avoid CORS issues
  const pdfUrl = `/api/pdf-proxy?fileId=${fileId}`

  return (
    <div className="min-h-screen bg-vtk-bg">
      <SubPageHeader
        categories={[]}
        formCategoryGroups={[]}
        useFormCategories={false}
        selectedCategories={[]}
        setSelectedCategories={() => {}}
        booths={[]}
        triggerFlicker={() => {}}
        eventName={eventName}
        isCompanyGuide={true}
      />
      <PDFViewer pdfUrl={pdfUrl} />
    </div>
  )
}

// ---------------- PDF Viewer Component ----------------
// Use iframe for perfect PDF rendering with CSS to hide internal scrollbar
function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  return (
    <>
      {/* CSS to completely hide PDF viewer scrollbars */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide all scrollbars in PDF iframe */
          .pdf-iframe-container iframe {
            overflow: hidden !important;
            scrollbar-width: none !important; /* Firefox */
            -ms-overflow-style: none !important; /* IE/Edge */
          }
          
          /* Hide scrollbars in WebKit browsers */
          .pdf-iframe-container iframe::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
          
          /* Hide scrollbar track and thumb */
          .pdf-iframe-container iframe::-webkit-scrollbar-track,
          .pdf-iframe-container iframe::-webkit-scrollbar-thumb {
            display: none !important;
          }
          
          /* Additional CSS to hide PDF.js scrollbars if present */
          .pdf-iframe-container iframe body,
          .pdf-iframe-container iframe body * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          
          .pdf-iframe-container iframe body::-webkit-scrollbar,
          .pdf-iframe-container iframe body *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          
          /* Make iframe content scrollable but hide scrollbar */
          .pdf-iframe-container iframe {
            pointer-events: auto !important;
          }
        `
      }} />
      <div className="pt-24 pb-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden pdf-iframe-container">
            {/* Use iframe with very large height to make it part of page flow */}
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
              className="w-full border-0"
              style={{ 
                minHeight: '800px',
                height: '20000px', // Very large height to avoid internal scrollbar
                display: 'block',
                overflow: 'hidden',
                border: 'none',
                pointerEvents: 'auto',
              }}
              title="Company Guide PDF"
              scrolling="no"
            />
          </div>
        </div>
      </div>
    </>
  )
}
