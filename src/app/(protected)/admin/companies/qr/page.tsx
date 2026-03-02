import { fetchCompaniesAction } from "@/app/actions/companies";
import CompanyQRsClient from "./client";

export default async function Page() {
  const companies = await fetchCompaniesAction();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold no-print">Company QR Codes</h1>
      <CompanyQRsClient initialCompanies={companies} />
    </div>
  );
}
