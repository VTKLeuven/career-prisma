import { getUserFromCookies } from "@/lib/auth-server";
import { listCareerSubOptions, listCareerEventOptions } from "@/lib/repos/option";
import { listCVBooks } from "@/lib/repos/cv-book";
import { listEvents } from "@/lib/repos/event";
import CareerOptionsClient from "./client";
import type { CareerEvent } from "@/lib/schema";
import { listAcademicYearsForAdmin, getCurrentAcademicYear } from "@/lib/repos/academic-year";
import { listOptionSales } from "@/lib/repos/option-sales";
import { listCompaniesBasic } from "@/lib/repos/company";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminCareerOptionsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [subOptions, options, events, academicYears, currentYear, sales, companies, cvBooks] = await Promise.all([
    listCareerSubOptions({ limit: 500 }),
    listCareerEventOptions({ limit: 1000, includeHistory: true }),
    listEvents({ limit: 500, sort: "-date", includeHistory: true }),
    listAcademicYearsForAdmin(),
    getCurrentAcademicYear(),
    listOptionSales(),
    listCompaniesBasic(),
    listCVBooks({ sort: "-year.start_of_year" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <PageHeader title="Career Options" description="Manage career event options and their sub-options." />
      <CareerOptionsClient
        initialSubOptions={subOptions}
        initialOptions={options ?? []}
        events={(events ?? []) as CareerEvent[]}
        subOptions={subOptions}
        academicYears={academicYears}
        currentAcademicYearId={currentYear?.id ? String(currentYear.id) : ""}
        sales={sales}
        companies={companies.map((company) => ({ value: company.id, label: company.name ?? "(unnamed)" }))}
        cvBooks={cvBooks.map((book) => ({
          value: String(book.id),
          label: [
            typeof book.year === "object" ? book.year?.name : null,
            typeof book.form === "object" ? book.form?.name : null,
          ].filter(Boolean).join(" · ") || `CV book #${book.id}`,
        }))}
      />
    </div>
  );
}
