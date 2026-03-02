"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function CompanyQRsClient({ initialCompanies }: { initialCompanies: any[] }) {
  const [baseUrl, setBaseUrl] = React.useState("");

  React.useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!baseUrl) return <div>Loading...</div>;

  return (
    <div>
      <div className="mb-4 no-print flex gap-4">
        <Button onClick={handlePrint}>Print QR Codes</Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-8 print:grid-cols-3 print:gap-8">
        {initialCompanies.map((company) => (
          <div key={company.id} className="border p-6 rounded-lg flex flex-col items-center justify-center text-center break-inside-avoid shadow-sm print:shadow-none print:border-gray-300">
            <h3 className="font-bold text-xl mb-4 text-gray-900">{company.name}</h3>
            {/* Using a reliable public QR code API */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(`${baseUrl}/booth/${company.id}`)}`} 
              alt={`QR Code for ${company.name}`}
              className="w-48 h-48 mb-2"
            />
            <p className="text-xs text-muted-foreground mt-2">{baseUrl}/booth/{company.id}</p>
          </div>
        ))}
      </div>
      
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white;
            color: black;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
