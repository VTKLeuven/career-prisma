"use client";

import Link from "next/link";
import type { Booth } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function PrintClient({
    booths,
    baseUrl,
    eventPageName,
    floorplanName,
}: {
    booths: Booth[];
    baseUrl: string;
    eventPageName?: string;
    floorplanName?: string;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // A4 dimensions in points (1 point = 1/72 inch)
      // A4 is 595.28 x 841.89
      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;
      const MARGIN = 20; // Reduced margin as requested
      const COLS = 3;
      const ROWS = 4;

      const cellWidth = (PAGE_WIDTH - (MARGIN * 2)) / COLS;
      const cellHeight = (PAGE_HEIGHT - (MARGIN * 2)) / ROWS;

      let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      let boothIndex = 0;

      for (let i = 0; i < booths.length; i++) {
        const booth = booths[i];

        // Add new page if current is full
        if (i > 0 && i % (COLS * ROWS) === 0) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          boothIndex = 0;
        }

        const col = boothIndex % COLS;
        const row = Math.floor(boothIndex / COLS);

        const x = MARGIN + (col * cellWidth);
        const y = PAGE_HEIGHT - MARGIN - ((row + 1) * cellHeight);

        // Draw cutting lines (dotted borders)
        // Draw rectangle
        page.drawRectangle({
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          borderColor: rgb(0.6, 0.6, 0.6), // Light gray
          borderWidth: 1,
          // Use standard dash pattern for "dotted" look
          borderDashArray: [2, 4],
        });

        // Content positioning
        const centerX = x + (cellWidth / 2);
        const centerY = y + (cellHeight / 2);

        // Company Name (Top of cell)
        const companyName = (booth.company?.name || "AVAILABLE").toUpperCase();
        const fontSize = 14;
        let textWidth = helveticaFont.widthOfTextAtSize(companyName, fontSize);

        // Use a smaller font if name is very long
        let finalFontSize = fontSize;
        if (textWidth > (cellWidth - 20)) {
          finalFontSize = 10;
          textWidth = helveticaFont.widthOfTextAtSize(companyName, finalFontSize);
        }

        page.drawText(companyName, {
          x: centerX - (textWidth / 2),
          y: y + cellHeight - 25, // Moved closer to top margin
          size: finalFontSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // QR Code (Center)
        const url = `${baseUrl}/booth/${booth.id}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url)}`; // Higher res for PDF

        try {
          const qrImageBytes = await fetch(qrUrl).then(res => res.arrayBuffer());
          const qrImage = await pdfDoc.embedPng(qrImageBytes);
          // 52% of cell width/height to ensure no overlaps
          const qrSize = Math.min(cellWidth, cellHeight) * 0.52;

          page.drawImage(qrImage, {
            x: centerX - (qrSize / 2),
            y: centerY - (qrSize / 2) + 5, // Slightly above center
            width: qrSize,
            height: qrSize,
          });
        } catch (e) {
          console.error("Failed to load QR", e);
          page.drawText("(QR Load Failed)", {
            x: centerX - 30,
            y: centerY,
            size: 8,
            font: helveticaRegular,
            color: rgb(1, 0, 0),
          });
        }

        // Booth Number (Bottom of cell)
        const boothText = `Booth ${booth.booth_number}`;
        page.drawText(boothText, {
          x: centerX - (helveticaFont.widthOfTextAtSize(boothText, 14) / 2),
          y: y + 35, // Positioned above floorplan
          size: 14,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Floorplan Name (Bottom of cell)
        const fpName = booth.Floorplan?.name || "";
        page.drawText(fpName, {
          x: centerX - (helveticaRegular.widthOfTextAtSize(fpName, 10) / 2),
          y: y + 20, // Bottom margin area
          size: 10,
          font: helveticaRegular,
          color: rgb(0.5, 0.5, 0.5),
        });

        boothIndex++;
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `booth-qrs-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();

    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Print Booth QR Codes</h1>
          {eventPageName && (
            <p className="text-sm text-muted-foreground mt-1">
              {eventPageName}
              {floorplanName ? ` – ${floorplanName}` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/zones">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Zones & Booths
            </Link>
          </Button>
          <Button onClick={generatePDF} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-8">
        <p className="text-sm text-yellow-800">
          ℹ️ Use the "Download PDF" button above to generate a print-ready file with proper cutting lines. Use the grid below only for verification.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 font-sans">
        {booths.map((booth) => {
          const url = `${baseUrl}/booth/${booth.id}`;
          const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

          return (
            <div key={booth.id} className="border border-neutral-400 border-dotted p-6 flex flex-col items-center justify-center text-center aspect-square shadow-sm bg-white">
              <h2 className="text-xl font-bold mb-4 uppercase tracking-tight line-clamp-2">{booth.company?.name || "Available"}</h2>
              <img src={qrSrc} alt={`QR for Booth ${booth.booth_number}`} className="w-48 h-48 object-contain" />
              <p className="mt-4 text-2xl font-mono font-bold">Booth {booth.booth_number}</p>
              <p className="text-sm text-gray-500 mt-2">{booth.Floorplan?.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  );
}
