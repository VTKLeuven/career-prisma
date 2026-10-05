import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorker";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

export const metadata: Metadata = {
  // Pages set their own title ("Vacancies", an event's name); the template
  // adds the site name, so tabs and search results read "Vacancies · VTK Career".
  title: { default: "VTK Career", template: "%s · VTK Career" },
  description:
    "Career events, company pages and vacancies from VTK, the engineering students' association at KU Leuven.",
  // Makes relative canonical / Open Graph URLs absolute.
  ...(appUrl ? { metadataBase: new URL(appUrl) } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ServiceWorkerRegistration />
        {children}
        {/* Notifications from toast() -- saves, errors -- instead of blocking alert() dialogs. */}
        <Toaster />
      </body>
    </html>
  );
}
