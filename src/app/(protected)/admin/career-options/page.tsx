import { getUserFromCookies } from "@/lib/auth-server";
import { listCareerSubOptions, listCareerEventOptions } from "@/lib/repos/option";
import { listEvents } from "@/lib/repos/event";
import CareerOptionsClient from "./client";
import type { CareerEvent } from "@/lib/schema";
import { listAcademicYearsForAdmin, getCurrentAcademicYear } from "@/lib/repos/academic-year";
import { listOptionSales } from "@/lib/repos/option-sales";
import { listCompaniesBasic } from "@/lib/repos/company";

export default async function AdminCareerOptionsPage() {
  const user = await getUserFromCookies();
  if (!user?.admin) return <p>NO ACCESS</p>;

  const [subOptions, options, events, academicYears, currentYear, sales, companies] = await Promise.all([
    listCareerSubOptions({ limit: 500 }),
    listCareerEventOptions({ limit: 1000, includeHistory: true }),
    listEvents({ limit: 500, sort: "-date", includeHistory: true }),
    listAcademicYearsForAdmin(),
    getCurrentAcademicYear(),
    listOptionSales(),
    listCompaniesBasic(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Career Options</h1>
        <p className="text-muted-foreground">
          Manage career event options and their sub-options.
        </p>
      </div>
      <CareerOptionsClient
        initialSubOptions={subOptions}
        initialOptions={options ?? []}
        events={(events ?? []) as CareerEvent[]}
        subOptions={subOptions}
        academicYears={academicYears}
        currentAcademicYearId={currentYear?.id ? String(currentYear.id) : ""}
        sales={sales}
        companies={companies.map((company) => ({ value: company.id, label: company.name ?? "(unnamed)" }))}
      />
    </div>
  );
}
