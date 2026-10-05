import Link from "next/link";

export default function CompanyNotFound() {
  return (
    <main className="min-h-svh bg-vtk-bg text-neutral-900 pt-24 md:pt-28">
      <div className="mx-auto max-w-7xl px-4 py-24">
        <div className="rounded-2xl border bg-white p-10 shadow-sm">
          <h1 className="text-2xl font-semibold text-neutral-900">Company not found</h1>
          <p className="mt-2 text-neutral-600">We couldn&apos;t find this company. It may be private or the link is incorrect.</p>
          <div className="mt-6">
            <Link href="/" className="text-vtk-blue underline">Go back home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
