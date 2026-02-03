"use client";

import type { Booth } from "@/lib/schema";
import { Button } from "@/components/ui/button";

export default function PrintClient({ booths, baseUrl }: { booths: Booth[], baseUrl: string }) {
    return (
        <div className="p-8 print:p-0">
            <div className="no-print mb-8 flex justify-between items-center">
                <h1 className="text-2xl font-bold">Print Booth QR Codes</h1>
                <Button onClick={() => window.print()}>
                    Print
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 print:grid-cols-3 print:gap-4 font-sans">
                {booths.map((booth) => {
                    const url = `${baseUrl}/booth/${booth.id}`;
                    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;

                    return (
                        <div key={booth.id} className="border-2 border-black p-4 flex flex-col items-center justify-center text-center aspect-square break-inside-avoid page-break-inside-avoid">
                            <h2 className="text-xl font-bold mb-2 uppercase tracking-tight line-clamp-2">{booth.company?.name || "Available"}</h2>
                            <img src={qrSrc} alt={`QR for Booth ${booth.booth_number}`} className="w-48 h-48 object-contain" />
                            <p className="mt-2 text-lg font-mono font-bold">Booth {booth.booth_number}</p>
                            <p className="text-xs text-gray-500 mt-1">{booth.Floorplan?.name}</p>
                        </div>
                    )
                })}
            </div>

            <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 0.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          /* Hide sidebar/header if they exist in layout */
          header, aside, .sidebar {
            display: none !important;
          }
        }
      `}</style>
        </div>
    );
}
