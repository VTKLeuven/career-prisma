// lib/utils/pdf-processor.ts
"use server";

// Use pdf-lib for Node.js (better server-side support)
// pdfjs-dist has issues with workers in Node.js environment

// For now, create a simplified version that uploads PDF and creates placeholder
// Full PDF processing can be added later with a proper Node.js PDF library

export interface BoothExtraction {
  booth_number: number;
  coords: {
    type: "rect";
    x_pct: number;
    y_pct: number;
    width_pct: number;
    height_pct: number;
    x_px: number;
    y_px: number;
    w_px: number;
    h_px: number;
    match: "sibling" | "contains" | "nearest" | "no_rects_found";
    rotation_deg?: number; // For rotated booths
  };
}

export interface PDFProcessingResult {
  svg: string;
  booths: BoothExtraction[];
  viewBox: string;
}

/**
 * Process PDF file and convert to SVG
 * Returns SVG content - booth extraction happens separately from the SVG
 */
export async function processPDF(pdfFile: File): Promise<PDFProcessingResult> {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Get PDF dimensions using pdf-lib
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error("PDF has no pages");
    }
    
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    const viewport = { width, height };
    
    // Convert PDF to SVG using pdfjs-dist with canvas rendering
    // This approach renders PDF to image and embeds it in SVG
    // It works without any external dependencies
    let svg: string;
    
    try {
      console.log("Converting PDF to SVG using pdfjs-dist and canvas...");
      
      // Import polyfills first (must be before pdfjs-dist)
      await import("./pdf-polyfills");
      
      // Use pdfjs-dist legacy build which may work better in Node.js
      let pdfjs;
      try {
        // Try legacy build first
        pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        console.log("Using pdfjs-dist legacy build");
      } catch (legacyError) {
        // Fallback to regular build
        pdfjs = await import("pdfjs-dist");
        console.log("Using pdfjs-dist regular build");
      }
      
      // Set worker source to empty to disable worker
      pdfjs.GlobalWorkerOptions.workerSrc = "";
      
      console.log("Loading PDF with pdfjs-dist...");
      
      // Load PDF document
      // The worker error might occur but we'll catch it and continue
      let pdf;
      try {
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
          verbosity: 0,
        });
        pdf = await loadingTask.promise;
      } catch (loadError: any) {
        // If we get a worker error, it might still work for rendering
        if (loadError.message?.includes("worker") || loadError.message?.includes("Worker")) {
          console.warn("Worker error during load, but PDF might still render:", loadError.message);
          // Try to get the document anyway - sometimes it works despite the error
          throw loadError; // Re-throw to fall back to placeholder
        }
        throw loadError;
      }
      console.log(`PDF loaded: ${pdf.numPages} pages`);
      
      const page = await pdf.getPage(1);
      const scale = 2.0; // Higher scale for better quality
      const viewport = page.getViewport({ scale });
      
      console.log(`Rendering page at scale ${scale}, viewport: ${viewport.width}x${viewport.height}`);
      
      // Use node-canvas for server-side rendering
      const { createCanvas } = require("canvas");
      const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
      const context = canvas.getContext("2d");
      
      if (!context) {
        throw new Error("Failed to get canvas context");
      }
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context as any,
        viewport: viewport,
        canvas: canvas,
      };
      
      console.log("Rendering PDF page to canvas...");
      await page.render(renderContext).promise;
      console.log("PDF page rendered successfully");
      
      // Convert canvas to base64 PNG
      const imageBuffer = canvas.toBuffer("image/png");
      const imageBase64 = imageBuffer.toString("base64");
      
      console.log(`Successfully converted PDF to image (${imageBuffer.length} bytes)`);
      
      // Create SVG with embedded image
      svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}">
  <image x="0" y="0" width="${width}" height="${height}" xlink:href="data:image/png;base64,${imageBase64}"/>
</svg>`;
      
      console.log(`Successfully created SVG with embedded image (${svg.length} characters)`);
    } catch (svgError) {
      const err = svgError instanceof Error ? svgError : new Error(String(svgError));
      console.error("Failed to convert PDF to SVG:", err.message);
      console.error("Error stack:", err.stack);
      
      // Fallback: Create a placeholder SVG
      console.log("Creating placeholder SVG instead...");
      svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#ffffff" stroke="#cccccc" stroke-width="2"/>
  <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="20" fill="#666666" font-family="Arial, sans-serif">
    PDF floorplan (${Math.round(width)} x ${Math.round(height)})
  </text>
</svg>`;
    }

    // No booth extraction here - that happens separately from the SVG
    return {
      svg,
      booths: [],
      viewBox: `0 0 ${width} ${height}`,
    };
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

