import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VacancyNotFound() {
  return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-vtk-blue/5">
        <div className="px-2 sm:px-0">
          <div className="mx-auto w-full max-w-7xl px-2 py-24 text-center sm:px-4">
          <div className="mx-auto max-w-md rounded-2xl border border-neutral-200/80 bg-white p-10 shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-neutral-900">
              Vacancy not found
            </h1>
            <p className="mb-6 text-neutral-600">
              This listing may have been removed or is no longer published.
            </p>
            <Button
              asChild
              variant="outline"
              className="border-vtk-blue/30 text-vtk-blue hover:bg-vtk-blue/5"
            >
              <Link href="/vacancies">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to vacancies
              </Link>
            </Button>
          </div>
          </div>
        </div>
      </div>
  );
}
