"use client"

export default function NoSidebarLayout({ children }: { children: React.ReactNode }) {
    // simple shell without sidebar/header
    // Header is rendered per-page, not in layout to avoid duplicates
    return <main className="min-h-svh bg-vtk-bg text-neutral-900">
        {children}</main>
}